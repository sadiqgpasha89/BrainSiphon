"""Partner authentication: signed webhooks with replay protection, certificate expiry for mTLS partners, and a rotation plan."""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import shutil
import subprocess
from typing import Dict, List, Optional


class SignatureError(Exception):
    pass


class WebhookVerifier:
    """HMAC-SHA256 over `timestamp + "." + body`. Two secrets are accepted during a rotation. A timestamp outside the tolerance, or a signature seen
    before, is refused: a captured webhook cannot be replayed."""

    def __init__(self, secrets: List[bytes], tolerance_s: int = 300):
        self.secrets, self.tolerance_s = list(secrets), tolerance_s
        self.seen: Dict[str, float] = {}

    def sign(self, body: bytes, ts: int, secret: Optional[bytes] = None) -> str:
        return base64.b64encode(hmac.new(secret or self.secrets[0], f"{ts}.".encode() + body, hashlib.sha256).digest()).decode()

    def verify(self, body: bytes, ts: int, signature: str, now: Optional[float] = None) -> None:
        now = now if now is not None else dt.datetime.now(dt.timezone.utc).timestamp()
        if abs(now - ts) > self.tolerance_s:
            raise SignatureError("timestamp outside the tolerance window")
        if not any(hmac.compare_digest(self.sign(body, ts, s), signature) for s in self.secrets):
            raise SignatureError("signature does not match")
        if signature in self.seen:
            raise SignatureError("signature already used (replay)")
        self.seen[signature] = now
        for k in [k for k, v in self.seen.items() if now - v > self.tolerance_s * 2]:
            del self.seen[k]


def cert_not_after(pem_path: str) -> dt.datetime:
    if not shutil.which("openssl"):
        raise RuntimeError("openssl is required to read certificate dates")
    p = subprocess.run(["openssl", "x509", "-in", pem_path, "-noout", "-enddate"], capture_output=True, text=True)
    if p.returncode != 0:
        raise ValueError(f"not a readable certificate: {p.stderr.strip()[:100]}")
    return dt.datetime.strptime(p.stdout.strip().split("=", 1)[1], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt.timezone.utc)


def rotation_plan(certs: Dict[str, dt.datetime], now: dt.datetime, warn_days: int = 45, urgent_days: int = 14) -> List[Dict[str, object]]:
    """Which partner certificates to rotate, in order of urgency. Rotation needs the partner's cooperation: start at `warn_days`, not at expiry."""
    out = []
    for name, na in sorted(certs.items(), key=lambda kv: kv[1]):
        left = (na - now).days
        out.append({"partner": name, "days_left": left, "action": "EXPIRED: replace now and confirm the partner trusts the new certificate" if left < 0 else "URGENT: rotate this week" if left <= urgent_days else "plan: request partner window" if left <= warn_days else "ok"})
    return out
