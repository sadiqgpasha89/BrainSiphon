"""HTTP reachability and API authentication checks (bearer, API key, basic, OAuth2 client credentials, mTLS)."""
from __future__ import annotations

import base64
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from ..model import CheckResult, Context, FAIL, PASS, SKIP, WARN, register_secret, register_value
from ..netutil import classify_error, effective_proxy, make_ssl_context


def _opener(ctx: Context, item: Dict[str, Any], url: str) -> urllib.request.OpenerDirector:
    handlers: List[Any] = []
    host = urllib.parse.urlparse(url).hostname or ""
    proxy = effective_proxy(ctx.proxy, host, urllib.parse.urlparse(url).scheme) if item.get("via_proxy", True) else None
    handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy} if proxy else {}))
    sctx = make_ssl_context(item.get("ca_file") or ctx.ca_file, item.get("verify_tls", True), item.get("client_cert"), item.get("client_key"))
    handlers.append(urllib.request.HTTPSHandler(context=sctx))
    return urllib.request.build_opener(*handlers)


def request(url: str, ctx: Context, item: Dict[str, Any], method: str = "GET", headers: Optional[Dict[str, str]] = None,
            data: Optional[bytes] = None) -> Tuple[int, Dict[str, str], bytes, float]:
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    t0 = time.monotonic()
    try:
        with _opener(ctx, item, url).open(req, timeout=float(item.get("timeout", ctx.timeout))) as r:
            return r.status, dict(r.headers), r.read(1_000_000), time.monotonic() - t0
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read(100_000) if e.fp else b"", time.monotonic() - t0


def decode_jwt_claims(token: str) -> Dict[str, Any]:
    """Read the claims of a JWT without verifying it: enough to show exp, aud and scope to the person running the check."""
    try:
        body = token.split(".")[1]
        body += "=" * (-len(body) % 4)
        return json.loads(base64.urlsafe_b64decode(body))
    except Exception:  # noqa: BLE001
        return {}


def run_http(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name, url = item["name"], item["url"]
    base = dict(id=f"http.{name}", name=f"HTTP: {name}", category="http", target=url, owner_hint=item.get("owner", "Customer platform team"))
    severity = item.get("severity", "blocking")
    try:
        status, headers, body, secs = request(url, ctx, item)
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"request failed ({code})", details={"error": str(e), "reason": code}, remediation=hint)]
    ok = item.get("expect_status", [200])
    if status not in ok:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"HTTP {status}, expected {ok}", details={"status": status, "seconds": round(secs, 3)}, remediation="Compare the status with the API gateway route and the allow-list for this source address.")]
    want = item.get("expect_json")
    if want:
        try:
            doc = json.loads(body or b"{}")
            miss = {k: v for k, v in want.items() if doc.get(k) != v}
            if miss:
                return [CheckResult(**base, status=FAIL, severity=severity, message=f"response body differs from expectation: {miss}", details={"status": status})]
        except ValueError:
            return [CheckResult(**base, status=FAIL, severity=severity, message="response was not JSON", details={"status": status})]
    return [CheckResult(**base, status=PASS, severity=severity, message=f"HTTP {status} in {secs*1000:.0f} ms", details={"status": status, "seconds": round(secs, 3)})]


def fetch_token(item: Dict[str, Any], ctx: Context) -> Tuple[Optional[str], Dict[str, Any]]:
    kind = item.get("auth_type", "oauth2_client_credentials")
    if kind == "bearer":
        return register_secret(item.get("token_env", "")), {}
    if kind == "oauth2_client_credentials":
        cid = register_secret(item["client_id_env"]) or ""
        sec = register_secret(item["client_secret_env"]) or ""
        if not cid or not sec:
            raise KeyError(f"environment variables {item['client_id_env']} / {item['client_secret_env']} are not set")
        form = {"grant_type": "client_credentials"}
        if item.get("scope"):
            form["scope"] = item["scope"]
        if item.get("audience"):
            form["audience"] = item["audience"]
        headers = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}
        if item.get("client_auth", "basic") == "basic":
            headers["Authorization"] = "Basic " + base64.b64encode(f"{cid}:{sec}".encode()).decode()
        else:
            form.update(client_id=cid, client_secret=sec)
        status, _h, body, secs = request(item["token_url"], ctx, item, "POST", headers, urllib.parse.urlencode(form).encode())
        doc = json.loads(body or b"{}")
        if status != 200 or "access_token" not in doc:
            raise PermissionError(f"token endpoint returned HTTP {status}: {doc.get('error', '')} {doc.get('error_description', '')}".strip())
        register_value(f"token.{item['name']}", doc["access_token"])  # the token itself is never written to the report
        return doc["access_token"], {"expires_in": doc.get("expires_in"), "token_type": doc.get("token_type"), "seconds": round(secs, 3), "claims": {k: v for k, v in decode_jwt_claims(doc["access_token"]).items() if k in ("iss", "aud", "exp", "scope", "scp", "azp", "sub")}}
    return None, {}


def run_api_auth(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    kind = item.get("auth_type", "oauth2_client_credentials")
    base = dict(id=f"auth.{name}", name=f"API authentication: {name}", category="api_auth", target=item.get("probe_url") or item.get("token_url", ""), owner_hint=item.get("owner", "Customer identity / API gateway team"))
    severity = item.get("severity", "blocking")
    headers: Dict[str, str] = {"Accept": "application/json"}
    details: Dict[str, Any] = {"auth_type": kind}
    try:
        if kind in ("oauth2_client_credentials", "bearer"):
            token, meta = fetch_token(item, ctx)
            details.update(meta)
            if not token:
                return [CheckResult(**base, status=FAIL, severity=severity, message="no token obtained", details=details, remediation="Set the environment variables named in the configuration.")]
            ctx.tokens[name] = token
            headers["Authorization"] = f"Bearer {token}"
            exp = (meta.get("claims") or {}).get("exp")
            if exp and exp - time.time() < 60:
                return [CheckResult(**base, status=WARN, severity="advisory", message="token expires in under a minute", details=details, remediation="Check the clock on this host and the token lifetime in the identity provider.")]
        elif kind == "api_key":
            key = register_secret(item["key_env"])
            if not key:
                raise KeyError(f"environment variable {item['key_env']} is not set")
            headers[item.get("header", "X-API-Key")] = key
        elif kind == "basic":
            u, p = register_secret(item["user_env"]), register_secret(item["password_env"])
            if not u or not p:
                raise KeyError("basic-auth environment variables are not set")
            headers["Authorization"] = "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()
        elif kind == "mtls":
            pass  # the client certificate is attached by the opener
    except (KeyError, PermissionError) as e:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"authentication failed before the probe: {e}", details=details, remediation="Check the credentials with the identity team: client id, secret, scope and audience must match the registration.")]
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"could not reach the token endpoint ({code})", details={**details, "error": str(e)}, remediation=hint)]
    probe = item.get("probe_url")
    if not probe:
        return [CheckResult(**base, status=PASS, severity=severity, message="token obtained", details=details)]
    try:
        status, _h, _b, secs = request(probe, ctx, item, item.get("method", "GET"), headers)
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"probe failed ({code})", details={**details, "error": str(e)}, remediation=hint)]
    details.update(status=status, seconds=round(secs, 3))
    ok = item.get("expect_status", [200])
    if status in ok:
        return [CheckResult(**base, status=PASS, severity=severity, message=f"authenticated, HTTP {status}", details=details)]
    why = {401: "authentication failed: the token was not accepted (issuer, audience, clock skew or expired secret)", 403: "authenticated but not authorised: the identity lacks the role or scope for this route", 429: "rate limited by the gateway"}.get(status, f"unexpected status {status}")
    return [CheckResult(**base, status=FAIL, severity=severity, message=f"HTTP {status}: {why}", details=details, remediation="401 is an identity problem, 403 is a permission problem: they go to different owners. Send the request id from the response to the API gateway team.")]
