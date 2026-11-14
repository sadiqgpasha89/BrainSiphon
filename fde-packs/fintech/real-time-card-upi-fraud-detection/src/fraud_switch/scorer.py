"""The scoring boundary. `StubScorer` is a transparent stand-in so the integration can be built and tested before the model service is
reachable; `HttpScorer` calls the real service (the realtime-decisioning reference implementation, or the customer's endpoint)."""
from __future__ import annotations

import json
import time
import urllib.request
from typing import Any, Callable, Dict, Optional

from .mapping import Decision


class ScoreTimeout(Exception):
    pass


def legacy_rules(req: Dict[str, Any]) -> Decision:
    """The customer's existing rules engine, reduced to its shape: the path traffic returns to when the model is unavailable or rolled back."""
    big = req["amount"] >= 100000
    risky_mcc = req["mcc"] in ("6051", "7995", "4829")
    if big and risky_mcc:
        return Decision("BLOCK", 0.95, ["RULE_HIGH_VALUE_RISKY_MCC"], "legacy-rules-v12", "fallback")
    if big or (risky_mcc and req["entry_mode"] in ("ecommerce", "manual")):
        return Decision("STEP_UP", 0.6, ["RULE_STEP_UP"], "legacy-rules-v12", "fallback")
    return Decision("ALLOW", 0.05, [], "legacy-rules-v12", "fallback")


class StubScorer:
    """Deterministic scorer with controllable latency and failure, for tests and demos. Not a model."""

    def __init__(self, latency_ms: float = 1.0, fail: bool = False, version: str = "stub-v1", sleep: Callable[[float], None] = time.sleep):
        self.latency_ms, self.fail, self.version, self.sleep = latency_ms, fail, version, sleep
        self.calls = 0

    def score(self, req: Dict[str, Any], deadline_ms: float) -> Decision:
        self.calls += 1
        if self.fail:
            raise ConnectionError("scoring service unreachable")
        if self.latency_ms > deadline_ms:
            self.sleep(deadline_ms / 1000)
            raise ScoreTimeout(f"no answer within {deadline_ms} ms")
        self.sleep(self.latency_ms / 1000)
        s = 0.02 + min(req["amount"] / 500000, 0.5) + (0.3 if req["entry_mode"] in ("ecommerce", "manual") else 0.0) + (0.15 if req["mcc"] in ("6051", "7995") else 0.0)
        s = round(min(s, 0.99), 3)
        if s >= 0.85:
            return Decision("BLOCK", s, ["HIGH_RISK_SCORE"], self.version)
        if s >= 0.5:
            return Decision("STEP_UP", s, ["ELEVATED_RISK_SCORE"], self.version)
        d = Decision("ALLOW", s, [], self.version)
        if req["amount"] >= 40000 and req["entry_mode"] == "ecommerce":
            d.approved_amount_minor = int(req["amount_minor"] * 0.5)  # example partial-approval policy for large e-commerce amounts
        return d


class HttpScorer:
    """POST the internal ScoreRequest to the model service. The timeout is the *remaining* budget, not a fixed number."""

    def __init__(self, url: str, bearer: str = ""):
        self.url, self.bearer = url, bearer

    def score(self, req: Dict[str, Any], deadline_ms: float) -> Decision:
        r = urllib.request.Request(self.url, data=json.dumps(req).encode(), headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {self.bearer}"} if self.bearer else {})})
        try:
            with urllib.request.urlopen(r, timeout=deadline_ms / 1000) as resp:
                d = json.loads(resp.read())
        except TimeoutError as e:
            raise ScoreTimeout(str(e)) from e
        return Decision(d["action"], d["score"], d.get("reason_codes", []), d.get("model_version", "unknown"), approved_amount_minor=d.get("approved_amount_minor"))
