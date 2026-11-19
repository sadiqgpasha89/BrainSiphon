"""Webhook verification: the signature, the timestamp window and replay protection, for Zendesk-style signed webhooks and any HMAC webhook."""
from __future__ import annotations

import base64
import hashlib
import hmac
from typing import Dict, Optional


class WebhookRejected(Exception):
    pass


class Verifier:
    """Zendesk signs `timestamp + body` with HMAC-SHA256 and sends base64 in `X-Zendesk-Webhook-Signature` and the timestamp in `X-Zendesk-Webhook-Signature-Timestamp`.
    The same shape is used by many platforms; configure the header names per platform."""

    def __init__(self, secrets: Dict[str, bytes], tolerance_s: int = 300, sig_header: str = "x-zendesk-webhook-signature", ts_header: str = "x-zendesk-webhook-signature-timestamp"):
        self.secrets, self.tol, self.sig_h, self.ts_h = dict(secrets), tolerance_s, sig_header, ts_header
        self.seen: Dict[str, float] = {}

    def sign(self, body: bytes, timestamp: str, kid: str) -> str:
        return base64.b64encode(hmac.new(self.secrets[kid], timestamp.encode() + body, hashlib.sha256).digest()).decode()

    def verify(self, headers: Dict[str, str], body: bytes, now: float) -> str:
        h = {k.lower(): v for k, v in headers.items()}
        sig, ts = h.get(self.sig_h), h.get(self.ts_h)
        if not sig or not ts:
            raise WebhookRejected("signature or timestamp header missing")
        try:
            import datetime as dt
            t = dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp() if not ts.isdigit() else float(ts)
        except ValueError:
            raise WebhookRejected("timestamp is not readable")
        if abs(now - t) > self.tol:
            raise WebhookRejected("timestamp outside the tolerance window")
        kid = next((k for k in self.secrets if hmac.compare_digest(self.sign(body, ts, k), sig)), None)
        if kid is None:
            raise WebhookRejected("signature does not match")
        if sig in self.seen:
            raise WebhookRejected("replayed webhook")
        self.seen[sig] = now
        return kid
