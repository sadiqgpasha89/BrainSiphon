"""HTTP client with the behaviour every enterprise integration needs: auth strategies with refresh, proxy and private CA, timeouts,
retry with Retry-After, a circuit breaker, an overall deadline, request ids, idempotency headers and redacted logging."""
from __future__ import annotations

import base64
import email.utils
import hashlib
import json
import os
import shutil
import ssl
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterator, Optional, Tuple

from .errors import AdapterError, AuthError, ConfigError, PermanentError, PermissionDenied, RateLimited, TimeoutExceeded, TransientError
from .retry import CircuitBreaker, Deadline, RetryPolicy

REQUEST_ID_HEADERS = ("x-request-id", "x-correlation-id", "sforce-limit-info", "x-ms-request-id", "x-amzn-requestid", "x-b3-traceid", "x-trace-id", "traceparent")
REDACT = {"authorization", "proxy-authorization", "x-api-key", "cookie", "x-csrf-token", "x-auth-token"}


@dataclass
class Response:
    status: int
    headers: Dict[str, str]
    body: bytes

    def json(self) -> Any:
        return json.loads(self.body.decode("utf-8")) if self.body else None

    def text(self) -> str:
        return self.body.decode("utf-8", "replace")


# ------------------------------------------------------------------------------------------------- auth strategies

class Auth:
    def headers(self, client: "HttpClient") -> Dict[str, str]:
        return {}

    def invalidate(self) -> None:
        """Called on a 401: drop any cached token so the next call fetches a new one."""


class NoAuth(Auth):
    pass


class BearerAuth(Auth):
    def __init__(self, token_env: str):
        self.token_env = token_env

    def headers(self, client: "HttpClient") -> Dict[str, str]:
        tok = os.environ.get(self.token_env, "")
        if not tok:
            raise ConfigError(f"environment variable {self.token_env} is not set")
        return {"Authorization": f"Bearer {tok}"}


class BasicAuth(Auth):
    def __init__(self, user_env: str, password_env: str):
        self.user_env, self.password_env = user_env, password_env

    def headers(self, client: "HttpClient") -> Dict[str, str]:
        u, p = os.environ.get(self.user_env, ""), os.environ.get(self.password_env, "")
        if not u or not p:
            raise ConfigError(f"environment variables {self.user_env} and {self.password_env} must be set")
        return {"Authorization": "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()}


class ApiKeyAuth(Auth):
    def __init__(self, header: str, key_env: str):
        self.header, self.key_env = header, key_env

    def headers(self, client: "HttpClient") -> Dict[str, str]:
        k = os.environ.get(self.key_env, "")
        if not k:
            raise ConfigError(f"environment variable {self.key_env} is not set")
        return {self.header: k}


class _TokenAuth(Auth):
    """Caches an access token and refreshes it a little before expiry, once per process even under concurrency."""

    skew = 60.0

    def __init__(self, clock: Callable[[], float] = time.time):
        self._tok: Optional[str] = None
        self._exp = 0.0
        self._lock = threading.Lock()
        self.clock = clock
        self.fetches = 0

    def _fetch(self, client: "HttpClient") -> Tuple[str, float]:
        raise NotImplementedError

    def headers(self, client: "HttpClient") -> Dict[str, str]:
        with self._lock:
            if not self._tok or self.clock() >= self._exp - self.skew:
                self._tok, ttl = self._fetch(client)
                self._exp = self.clock() + ttl
                self.fetches += 1
            return {"Authorization": f"Bearer {self._tok}"}

    def invalidate(self) -> None:
        with self._lock:
            self._tok, self._exp = None, 0.0


class OAuth2ClientCredentials(_TokenAuth):
    def __init__(self, token_url: str, client_id_env: str, client_secret_env: str, scope: str = "", audience: str = "", client_auth: str = "basic", **kw):
        super().__init__(**kw)
        self.token_url, self.cid_env, self.sec_env = token_url, client_id_env, client_secret_env
        self.scope, self.audience, self.client_auth = scope, audience, client_auth

    def _fetch(self, client: "HttpClient") -> Tuple[str, float]:
        cid, sec = os.environ.get(self.cid_env, ""), os.environ.get(self.sec_env, "")
        if not cid or not sec:
            raise ConfigError(f"environment variables {self.cid_env} and {self.sec_env} must be set")
        form = {"grant_type": "client_credentials"}
        if self.scope: form["scope"] = self.scope
        if self.audience: form["audience"] = self.audience
        hdr = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}
        if self.client_auth == "basic":
            hdr["Authorization"] = "Basic " + base64.b64encode(f"{cid}:{sec}".encode()).decode()
        else:
            form.update(client_id=cid, client_secret=sec)
        r = client.raw("POST", self.token_url, data=urllib.parse.urlencode(form).encode(), headers=hdr, auth=False, retry=True)
        doc = r.json() or {}
        if "access_token" not in doc:
            raise AuthError(f"token endpoint did not return an access_token: {doc.get('error', '')} {doc.get('error_description', '')}".strip(), status=r.status)
        return doc["access_token"], float(doc.get("expires_in", 300))


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def rs256_sign(signing_input: bytes, private_key_pem_path: str) -> bytes:
    """RSASSA-PKCS1-v1_5 SHA-256 using `cryptography` when installed, else the `openssl` CLI (no key material on the command line)."""
    try:
        from cryptography.hazmat.primitives import hashes, serialization  # type: ignore
        from cryptography.hazmat.primitives.asymmetric import padding  # type: ignore

        with open(private_key_pem_path, "rb") as f:
            key = serialization.load_pem_private_key(f.read(), password=None)
        return key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    except ImportError:
        if not shutil.which("openssl"):
            raise ConfigError("RS256 signing needs the 'cryptography' package or the openssl CLI")
        p = subprocess.run(["openssl", "dgst", "-sha256", "-sign", private_key_pem_path], input=signing_input, capture_output=True)
        if p.returncode != 0:
            raise ConfigError("openssl could not sign with the configured key: " + p.stderr.decode()[:200])
        return p.stdout


class JwtBearer(_TokenAuth):
    """OAuth2 JWT-bearer grant (RFC 7523), as used by Salesforce server-to-server and many partner APIs. RS256."""

    def __init__(self, token_url: str, issuer_env: str, subject_env: str, audience: str, private_key_path_env: str, lifetime: int = 180, **kw):
        super().__init__(**kw)
        self.token_url, self.iss_env, self.sub_env, self.aud, self.key_env, self.lifetime = token_url, issuer_env, subject_env, audience, private_key_path_env, lifetime

    def assertion(self) -> str:
        key = os.environ.get(self.key_env, "")
        if not key:
            raise ConfigError(f"environment variable {self.key_env} (path to the private key) is not set")
        now = int(self.clock())
        claims = {"iss": os.environ.get(self.iss_env, ""), "sub": os.environ.get(self.sub_env, ""), "aud": self.aud, "exp": now + self.lifetime, "jti": uuid.uuid4().hex}
        head = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
        body = b64url(json.dumps(claims, separators=(",", ":")).encode())
        sig = b64url(rs256_sign(f"{head}.{body}".encode(), key))
        return f"{head}.{body}.{sig}"

    def _fetch(self, client: "HttpClient") -> Tuple[str, float]:
        form = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": self.assertion()}).encode()
        r = client.raw("POST", self.token_url, data=form, headers={"Content-Type": "application/x-www-form-urlencoded"}, auth=False, retry=True)
        doc = r.json() or {}
        if "access_token" not in doc:
            raise AuthError(f"JWT-bearer grant refused: {doc.get('error', '')} {doc.get('error_description', '')}".strip(), status=r.status)
        return doc["access_token"], float(doc.get("expires_in", 900))


def build_auth(spec: Optional[Dict[str, Any]]) -> Auth:
    if not spec or spec.get("type", "none") == "none":
        return NoAuth()
    t = spec["type"]
    try:
        if t == "bearer": return BearerAuth(spec["token_env"])
        if t == "basic": return BasicAuth(spec["user_env"], spec["password_env"])
        if t == "api_key": return ApiKeyAuth(spec.get("header", "X-API-Key"), spec["key_env"])
        if t == "oauth2_client_credentials":
            return OAuth2ClientCredentials(spec["token_url"], spec["client_id_env"], spec["client_secret_env"], spec.get("scope", ""), spec.get("audience", ""), spec.get("client_auth", "basic"))
        if t == "jwt_bearer":
            return JwtBearer(spec["token_url"], spec["issuer_env"], spec["subject_env"], spec["audience"], spec["private_key_path_env"])
    except KeyError as e:
        raise ConfigError(f"auth type '{t}' needs the setting {e}")
    raise ConfigError(f"unknown auth type '{t}'")


# ------------------------------------------------------------------------------------------------- the client

def parse_retry_after(v: Optional[str]) -> Optional[float]:
    if not v:
        return None
    v = v.strip()
    if v.isdigit():
        return float(v)
    try:
        return max(0.0, email.utils.parsedate_to_datetime(v).timestamp() - time.time())
    except (TypeError, ValueError):
        return None


class HttpClient:
    def __init__(self, base_url: str = "", auth: Optional[Auth] = None, retry: Optional[RetryPolicy] = None, connect_timeout: float = 5.0,
                 read_timeout: float = 30.0, deadline_seconds: Optional[float] = None, headers: Optional[Dict[str, str]] = None,
                 proxy: Optional[str] = None, ca_file: Optional[str] = None, verify: bool = True, breaker: Optional[CircuitBreaker] = None,
                 log: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.base = base_url.rstrip("/")
        self.auth = auth or NoAuth()
        self.retry = retry or RetryPolicy()
        self.timeout = max(connect_timeout, read_timeout)
        self.deadline_seconds = deadline_seconds
        self.headers = headers or {}
        self.breaker = breaker or CircuitBreaker()
        self.log = log or (lambda e: None)
        import http.cookiejar

        handlers = [urllib.request.ProxyHandler({"http": proxy, "https": proxy} if proxy else {}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())]
        ctx = ssl.create_default_context(cafile=ca_file) if verify else ssl._create_unverified_context()  # noqa: SLF001 - verify=False is an explicit, logged choice
        handlers.append(urllib.request.HTTPSHandler(context=ctx))
        self._opener = urllib.request.build_opener(*handlers)
        self.calls = 0

    def _url(self, path: str, params: Optional[Dict[str, Any]]) -> str:
        url = path if path.startswith(("http://", "https://")) else f"{self.base}/{path.lstrip('/')}"
        if params:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params, doseq=True, safe="$,:()'")
        return url

    def raw(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None, json_body: Any = None, data: Optional[bytes] = None,
            headers: Optional[Dict[str, str]] = None, auth: bool = True, retry: bool = True, idempotency_key: Optional[str] = None,
            idempotency_header: str = "Idempotency-Key", ok: Tuple[int, ...] = ()) -> Response:
        """One logical request: retries transient failures, refreshes the token once on 401, maps statuses to the error taxonomy."""
        deadline = Deadline(self.deadline_seconds) if self.deadline_seconds else None
        req_id = uuid.uuid4().hex
        state = {"refreshed": False}

        def once() -> Response:
            hdrs = {"Accept": "application/json", "X-Request-Id": req_id, **self.headers}
            body = data
            if json_body is not None:
                body = json.dumps(json_body).encode()
                hdrs["Content-Type"] = "application/json"
            if auth:
                hdrs.update(self.auth.headers(self))
            if idempotency_key:
                hdrs[idempotency_header] = idempotency_key
            hdrs.update(headers or {})
            url = self._url(path, params)
            t0 = time.monotonic()
            self.calls += 1
            req = urllib.request.Request(url, data=body, method=method, headers=hdrs)
            try:
                with self._opener.open(req, timeout=self.timeout) as r:
                    resp = Response(r.status, {k.lower(): v for k, v in r.headers.items()}, r.read())
            except urllib.error.HTTPError as e:
                resp = Response(e.code, {k.lower(): v for k, v in (e.headers or {}).items()}, e.read() if e.fp else b"")
            except urllib.error.URLError as e:
                reason = getattr(e, "reason", e)
                if isinstance(reason, TimeoutError) or "timed out" in str(reason):
                    raise TimeoutExceeded(f"{method} {path}: timed out", request_id=req_id) from e
                raise TransientError(f"{method} {path}: {reason}", request_id=req_id) from e
            except (TimeoutError, ConnectionError, OSError) as e:
                raise TransientError(f"{method} {path}: {e}", request_id=req_id) from e
            self.log({"method": method, "url": url.split("?")[0], "status": resp.status, "ms": int((time.monotonic() - t0) * 1000), "request_id": req_id, "headers": {k: ("***" if k.lower() in REDACT else v) for k, v in hdrs.items()}})
            return self._classify(resp, method, path, req_id, ok, state)

        def guarded() -> Response:
            return self.breaker.call(once)

        if not retry:
            return guarded()
        return self.retry.call(guarded, deadline=deadline)

    def _classify(self, r: Response, method: str, path: str, req_id: str, ok: Tuple[int, ...], state: Dict[str, bool]) -> Response:
        rid = next((r.headers[h] for h in REQUEST_ID_HEADERS if h in r.headers), req_id)
        detail = r.text()[:300]
        if 200 <= r.status < 300 or r.status in ok:
            return r
        what = f"{method} {path}: HTTP {r.status}"
        if r.status == 401:
            if not state["refreshed"]:
                state["refreshed"] = True
                self.auth.invalidate()
                raise TransientError(what + " (token refresh)", status=401, request_id=rid)  # retried once with a fresh token
            raise AuthError(what, status=401, request_id=rid, detail=detail)
        if r.status == 403:
            raise PermissionDenied(what, status=403, request_id=rid, detail=detail)
        if r.status == 429:
            raise RateLimited(what, retry_after=parse_retry_after(r.headers.get("retry-after")), status=429, request_id=rid, detail=detail)
        if r.status in (408, 425) or r.status >= 500:
            raise TransientError(what, status=r.status, request_id=rid, detail=detail)
        raise PermanentError(what, status=r.status, request_id=rid, detail=detail)

    def get(self, path: str, **kw: Any) -> Response: return self.raw("GET", path, **kw)
    def post(self, path: str, **kw: Any) -> Response: return self.raw("POST", path, **kw)
    def put(self, path: str, **kw: Any) -> Response: return self.raw("PUT", path, **kw)
    def patch(self, path: str, **kw: Any) -> Response: return self.raw("PATCH", path, **kw)
    def delete(self, path: str, **kw: Any) -> Response: return self.raw("DELETE", path, **kw)
