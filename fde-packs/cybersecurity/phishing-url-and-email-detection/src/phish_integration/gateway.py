"""The synchronous inspection API the email gateway calls inline, kept separate from asynchronous event ingestion.

Inline means a deadline and a failure policy: the gateway will not wait. The policy for 'we could not decide in time' is a business decision with a measured cost either way,
and it is configuration, not code."""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, Optional


class InspectionService:
    def __init__(self, score_fn: Callable[[Dict[str, Any]], Dict[str, Any]], *, deadline_ms: float = 100.0, on_timeout: str = "deliver_with_banner", allow_list: Optional[set] = None, block_threshold: float = 0.9, banner_threshold: float = 0.5,
                 clock: Callable[[], float] = time.perf_counter):
        if on_timeout not in ("deliver", "deliver_with_banner", "quarantine"):
            raise ValueError("on_timeout must be deliver, deliver_with_banner or quarantine")
        self.score_fn, self.deadline_ms, self.on_timeout, self.allow = score_fn, deadline_ms, on_timeout, allow_list or set()
        self.block_t, self.banner_t, self.clock = block_threshold, banner_threshold, clock
        self.stats = {"inspected": 0, "timeouts": 0, "errors": 0, "allow_listed": 0}

    def inspect(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """Returns {"disposition": deliver|banner|quarantine, "verdict", "score", "reasons", "decided_by"}. Quarantine is a *recommendation* the gateway applies: it is not a response action taken by us."""
        self.stats["inspected"] += 1
        sender = msg.get("sender", "").lower()
        if sender in self.allow or sender.split("@")[-1] in self.allow:
            self.stats["allow_listed"] += 1
            return {"disposition": "deliver", "verdict": "allow-listed", "score": 0.0, "reasons": ["sender or domain on the trusted list"], "decided_by": "policy"}
        t0 = self.clock()
        try:
            v = self.score_fn(msg)
        except Exception as e:  # noqa: BLE001
            self.stats["errors"] += 1
            return self._fallback(f"scoring error: {type(e).__name__}")
        if (self.clock() - t0) * 1000 > self.deadline_ms:
            self.stats["timeouts"] += 1
            return self._fallback("deadline exceeded")
        s = v["score"]
        disp = "quarantine" if s >= self.block_t else "banner" if s >= self.banner_t else "deliver"
        return {"disposition": disp, "verdict": "phish" if s >= self.block_t else "suspicious" if s >= self.banner_t else "clean", "score": s, "reasons": v.get("reasons", []), "model_version": v.get("model_version", ""), "decided_by": "model"}

    def _fallback(self, why: str) -> Dict[str, Any]:
        disp = {"deliver": "deliver", "deliver_with_banner": "banner", "quarantine": "quarantine"}[self.on_timeout]
        return {"disposition": disp, "verdict": "undecided", "score": None, "reasons": [why], "decided_by": "fallback-policy"}
