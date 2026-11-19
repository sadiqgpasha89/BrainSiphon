"""Exchange and partner authentication: request verification, partner keys with rotation, notice-callback signatures, and per-exchange traffic control."""
from __future__ import annotations

import hashlib
import hmac
import ipaddress
from typing import Dict, Iterable, List, Optional


class AuthError(Exception):
    pass


class ExchangeAuth:
    """Each exchange has: allowed source networks, its own signing keys (two valid during rotation), and its own traffic share. One exchange's compromise or misbehaviour cannot affect another."""

    def __init__(self, exchanges: Dict[str, Dict]):
        self.ex = exchanges

    def check_source(self, exchange: str, ip: str) -> None:
        nets = self.ex[exchange].get("source_cidrs", [])
        if nets and not any(ipaddress.ip_address(ip) in ipaddress.ip_network(n) for n in nets):
            raise AuthError(f"{ip} is not a registered source for {exchange}")

    def sign_notice(self, exchange: str, payload: bytes, key_id: Optional[str] = None) -> Dict[str, str]:
        keys = self.ex[exchange]["keys"]
        kid = key_id or next(iter(keys))
        return {"x-key-id": kid, "x-signature": hmac.new(keys[kid].encode(), payload, hashlib.sha256).hexdigest()}

    def verify_notice(self, exchange: str, payload: bytes, headers: Dict[str, str]) -> None:
        keys = self.ex[exchange]["keys"]
        kid = headers.get("x-key-id", "")
        if kid not in keys:
            raise AuthError(f"unknown or retired key id {kid!r}")
        if not hmac.compare_digest(hmac.new(keys[kid].encode(), payload, hashlib.sha256).hexdigest(), headers.get("x-signature", "")):
            raise AuthError("signature does not match")

    def rotate(self, exchange: str, new_kid: str, new_key: str) -> None:
        self.ex[exchange]["keys"][new_kid] = new_key

    def retire(self, exchange: str, kid: str) -> None:
        if len(self.ex[exchange]["keys"]) < 2:
            raise AuthError("cannot retire the only key")
        self.ex[exchange]["keys"].pop(kid, None)


class ExchangeTraffic:
    """Per-exchange canary: a traffic share and an automatic rollback to zero when the exchange's own guardrails break (timeout rate, invalid-bid rate)."""

    def __init__(self, shares: Dict[str, float], max_timeout_rate: float = 0.05, max_invalid_rate: float = 0.02, min_samples: int = 100):
        self.shares, self.max_timeout, self.max_invalid, self.min_samples = dict(shares), max_timeout_rate, max_invalid_rate, min_samples
        self.stats: Dict[str, Dict[str, int]] = {e: {"n": 0, "timeouts": 0, "invalid": 0} for e in shares}
        self.rolled_back: Dict[str, str] = {}

    def allow(self, exchange: str, bucket: float) -> bool:
        """`bucket` is a stable hash of the request id in [0,1): the same request always gets the same answer."""
        return exchange not in self.rolled_back and bucket < self.shares.get(exchange, 0.0)

    def observe(self, exchange: str, *, timeout: bool = False, invalid: bool = False) -> None:
        s = self.stats[exchange]
        s["n"] += 1
        s["timeouts"] += int(timeout)
        s["invalid"] += int(invalid)
        if s["n"] >= self.min_samples and exchange not in self.rolled_back:
            if s["timeouts"] / s["n"] > self.max_timeout:
                self.rolled_back[exchange] = f"timeout rate {s['timeouts'] / s['n']:.1%}"
            elif s["invalid"] / s["n"] > self.max_invalid:
                self.rolled_back[exchange] = f"invalid-bid rate {s['invalid'] / s['n']:.1%}"
            if exchange in self.rolled_back:
                self.shares[exchange] = 0.0
