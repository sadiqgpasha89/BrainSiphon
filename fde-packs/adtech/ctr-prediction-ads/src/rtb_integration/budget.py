"""Deadline-aware execution and the latency budget.

An RTB response that arrives after `tmax` is worth nothing and costs a connection, so every stage is given what is *left*, not a fixed number, and the
pipeline answers no-bid rather than late. The budget is broken into stages and measured per stage so a p99 breach points at the stage that caused it."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

DEFAULT_BUDGET_MS = {"network_in": 1.0, "parse": 0.3, "consent": 0.1, "features": 2.0, "inference": 2.0, "auction_and_pacing": 0.4, "response": 0.3, "network_out": 1.0, "reserve": 0.9}  # sums to 8.0


class DeadlineExceeded(Exception):
    def __init__(self, stage: str, elapsed_ms: float, budget_ms: float):
        super().__init__(f"deadline passed before stage '{stage}': {elapsed_ms:.2f} ms elapsed of {budget_ms:.2f} ms")
        self.stage = stage


@dataclass
class Pipeline:
    """stages: ordered (name, fn(ctx) -> ctx). `clock` is injectable so tests are deterministic."""

    stages: List[Tuple[str, Callable[[Dict[str, Any]], Dict[str, Any]]]]
    budget_ms: float = 8.0
    clock: Callable[[], float] = time.perf_counter
    samples: Dict[str, List[float]] = field(default_factory=dict)
    totals: List[float] = field(default_factory=list)
    no_bids: Dict[str, int] = field(default_factory=dict)

    def run(self, ctx: Dict[str, Any], tmax_ms: Optional[float] = None, network_reserve_ms: float = 2.0) -> Dict[str, Any]:
        """Runs the stages inside min(budget, tmax - network reserve). Before each stage, if the time left is less than the stage's p50 so far, answer no-bid."""
        limit = min(self.budget_ms, (tmax_ms - network_reserve_ms) if tmax_ms else self.budget_ms)
        t0 = self.clock()
        for name, fn in self.stages:
            elapsed = (self.clock() - t0) * 1000
            seen = self.samples.get(name)
            typical = sorted(seen)[len(seen) // 2] if seen else 0.0
            if elapsed + typical > limit:
                self.no_bids[name] = self.no_bids.get(name, 0) + 1
                self.totals.append(elapsed)
                raise DeadlineExceeded(name, elapsed, limit)
            s = self.clock()
            ctx = fn(ctx)
            self.samples.setdefault(name, []).append((self.clock() - s) * 1000)
        self.totals.append((self.clock() - t0) * 1000)
        return ctx

    @staticmethod
    def _pct(xs: List[float], p: float) -> float:
        if not xs:
            return 0.0
        xs = sorted(xs)
        k = (len(xs) - 1) * p / 100
        lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
        return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)

    def report(self) -> Dict[str, Any]:
        stages = {n: {"p50": round(self._pct(v, 50), 4), "p99": round(self._pct(v, 99), 4), "n": len(v)} for n, v in self.samples.items()}
        return {"end_to_end_ms": {"p50": round(self._pct(self.totals, 50), 4), "p99": round(self._pct(self.totals, 99), 4)}, "stages": stages, "no_bid_by_stage": dict(self.no_bids), "budget_ms": self.budget_ms,
                "worst_stage_p99": max(stages, key=lambda n: stages[n]["p99"]) if stages else None}
