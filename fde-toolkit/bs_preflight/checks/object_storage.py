"""S3-compatible object-storage check (AWS S3, MinIO, Ceph, StorageGRID): signed requests using the standard library only."""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

from ..model import CheckResult, Context, FAIL, PASS, WARN, register_secret
from ..netutil import classify_error
from .http import request


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def sigv4_headers(method: str, url: str, region: str, access_key: str, secret_key: str, payload: bytes = b"",
                  service: str = "s3", now: Optional[dt.datetime] = None, session_token: Optional[str] = None) -> Dict[str, str]:
    """AWS Signature Version 4 for an S3-style request. Deterministic when `now` is given, which is how the tests pin it."""
    u = urllib.parse.urlparse(url)
    now = now or dt.datetime.now(dt.timezone.utc)
    amz, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    headers = {"host": u.netloc, "x-amz-content-sha256": payload_hash, "x-amz-date": amz}
    if session_token:
        headers["x-amz-security-token"] = session_token
    signed = ";".join(sorted(headers))
    canon_headers = "".join(f"{k}:{headers[k]}\n" for k in sorted(headers))
    query = "&".join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(v, safe='-_.~')}" for k, v in sorted(urllib.parse.parse_qsl(u.query, keep_blank_values=True)))
    canonical = "\n".join([method, urllib.parse.quote(u.path or "/", safe="/-_.~"), query, canon_headers, signed, payload_hash])
    scope = f"{day}/{region}/{service}/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", amz, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    k = _sign(_sign(_sign(_sign(("AWS4" + secret_key).encode(), day), region), service), "aws4_request")
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    out = {"x-amz-date": amz, "x-amz-content-sha256": payload_hash, "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed}, Signature={sig}"}
    if session_token:
        out["x-amz-security-token"] = session_token
    return out


def _url(item: Dict[str, Any], key: str = "", query: str = "") -> str:
    ep = item["endpoint"].rstrip("/")
    bucket = item["bucket"]
    if item.get("path_style", True):
        return f"{ep}/{bucket}" + (f"/{urllib.parse.quote(key)}" if key else "/") + (f"?{query}" if query else "")
    sch, _, host = ep.partition("://")
    return f"{sch}://{bucket}.{host}/" + urllib.parse.quote(key) + (f"?{query}" if query else "")


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    base = dict(id=f"s3.{name}", name=f"Object storage: {name}", category="object_storage", target=f"{item['endpoint']}/{item['bucket']}", owner_hint=item.get("owner", "Customer storage / platform team"))
    severity = item.get("severity", "blocking")
    ak, sk = register_secret(item["access_key_env"]), register_secret(item["secret_key_env"])
    tok = register_secret(item["session_token_env"]) if item.get("session_token_env") else None
    if not ak or not sk:
        return [CheckResult(**base, status=FAIL, severity=severity, message="credentials not set in the environment", remediation=f"Export {item['access_key_env']} and {item['secret_key_env']}; they are never written to the report.")]
    region = item.get("region", "us-east-1")
    results: List[CheckResult] = []

    def call(method: str, url: str, body: bytes = b"") -> Tuple[int, bytes]:
        h = sigv4_headers(method, url, region, ak, sk, body, session_token=tok)
        st, _h, b, _ = request(url, ctx, item, method, h, body or None)
        return st, b

    try:
        st, body = call("GET", _url(item, query="list-type=2&max-keys=1"))
        if st == 200:
            results.append(CheckResult(**base, status=PASS, severity=severity, message="bucket listed with the supplied credentials"))
        else:
            why = {403: "authenticated but not permitted (bucket policy, IAM, or a clock or region mismatch in the signature)", 404: "bucket or endpoint path not found (path-style versus virtual-host style, or the wrong bucket name)", 301: "bucket is in a different region"}.get(st, f"HTTP {st}")
            results.append(CheckResult(**base, status=FAIL, severity=severity, message=f"list failed: {why}", details={"status": st, "body": body[:200].decode("utf-8", "replace")}, remediation="Check region, addressing style and the policy that grants s3:ListBucket to this principal."))
            return results
        if item.get("write_probe"):
            key = f"_bs_preflight/{hashlib.sha1(name.encode()).hexdigest()[:8]}.txt"
            wb = dict(base, id=base["id"] + ".write", name=base["name"] + " write/read/delete")
            s1, _ = call("PUT", _url(item, key), b"bs-preflight")
            s2, got = call("GET", _url(item, key))
            s3, _ = call("DELETE", _url(item, key))
            ok = s1 in (200, 201) and s2 == 200 and got == b"bs-preflight" and s3 in (200, 204)
            results.append(CheckResult(**wb, status=PASS if ok else FAIL, severity=severity, message="canary object written, read back and deleted" if ok else f"canary failed: PUT {s1}, GET {s2}, DELETE {s3}", remediation="" if ok else "Grant s3:PutObject, s3:GetObject and s3:DeleteObject on the prefix _bs_preflight/."))
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(getattr(e, "reason", e))
        results.append(CheckResult(**base, status=FAIL, severity=severity, message=f"request failed ({code})", details={"error": str(e)}, remediation=hint))
    return results
