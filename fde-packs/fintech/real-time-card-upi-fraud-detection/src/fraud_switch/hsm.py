"""Cryptographic boundary: tokenisation and key rotation behind an interface a real HSM or token vault implements.

The `SoftwareTokeniser` in this file is a DEVELOPMENT MOCK. It keeps keys in process memory and must never be used with real PANs.
What the scorer needs is the interface: it asks for a token and never sees a key, a PIN block or EMV cryptograms. ARQC/ARPC
verification, PIN translation and key custody stay in the customer's HSM (Thales payShield, Utimaco, AWS Payment Cryptography,
Azure Payment HSM), owned by the customer's payments security team.
"""
from __future__ import annotations

import hashlib
import hmac
from typing import Dict, List


class Tokeniser:
    def tokenise(self, pan: str) -> str:
        raise NotImplementedError

    def key_ids(self) -> List[str]:
        raise NotImplementedError


class SoftwareTokeniser(Tokeniser):
    """Deterministic keyed token: `kid:hex`. The same PAN under the same key id always gives the same token, so velocity and graph
    features join across transactions; rotation adds a key id and keeps verifying the old one during the overlap window."""

    def __init__(self, keys: Dict[str, bytes], active: str):
        if active not in keys:
            raise ValueError("active key id must be one of the keys")
        self.keys, self.active = dict(keys), active

    def tokenise(self, pan: str, kid: str = "") -> str:
        kid = kid or self.active
        return f"{kid}:" + hmac.new(self.keys[kid], pan.encode(), hashlib.sha256).hexdigest()[:24]

    def matches(self, pan: str, token: str) -> bool:
        kid = token.split(":", 1)[0]
        return kid in self.keys and hmac.compare_digest(self.tokenise(pan, kid), token)

    def rotate(self, new_kid: str, key: bytes) -> None:
        """Step 1 of rotation: new tokens use the new key, old tokens still verify. Retire the old key only after re-tokenisation."""
        self.keys[new_kid] = key
        self.active = new_kid

    def retire(self, kid: str) -> None:
        if kid == self.active:
            raise ValueError("cannot retire the active key")
        self.keys.pop(kid, None)

    def key_ids(self) -> List[str]:
        return sorted(self.keys)
