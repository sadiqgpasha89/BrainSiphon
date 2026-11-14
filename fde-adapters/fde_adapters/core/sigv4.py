"""AWS Signature Version 4 for S3-compatible services (AWS S3, MinIO, Ceph, StorageGRID). Verified against the AWS documentation vectors."""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import urllib.parse
from typing import Dict, Optional


def _h(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def sign(method: str, url: str, region: str, access_key: str, secret_key: str, payload: bytes = b"", service: str = "s3",
         now: Optional[dt.datetime] = None, session_token: Optional[str] = None, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    u = urllib.parse.urlparse(url)
    now = now or dt.datetime.now(dt.timezone.utc)
    amz, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    ph = hashlib.sha256(payload).hexdigest()
    hdrs = {"host": u.netloc, "x-amz-content-sha256": ph, "x-amz-date": amz}
    if session_token:
        hdrs["x-amz-security-token"] = session_token
    for k, v in (extra_headers or {}).items():
        hdrs[k.lower()] = v.strip()
    names = sorted(hdrs)
    signed = ";".join(names)
    query = "&".join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(v, safe='-_.~')}" for k, v in sorted(urllib.parse.parse_qsl(u.query, keep_blank_values=True)))
    canonical = "\n".join([method, urllib.parse.quote(urllib.parse.unquote(u.path) or "/", safe="/-_.~"), query, "".join(f"{k}:{hdrs[k]}\n" for k in names), signed, ph])
    scope = f"{day}/{region}/{service}/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", amz, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    k = _h(_h(_h(_h(("AWS4" + secret_key).encode(), day), region), service), "aws4_request")
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    out = {"x-amz-date": amz, "x-amz-content-sha256": ph, "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed}, Signature={sig}"}
    if session_token:
        out["x-amz-security-token"] = session_token
    return out
