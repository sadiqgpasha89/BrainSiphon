"""Forecasts for SKUs and stores without history: borrow from peers, say so in the output, and widen the interval."""
from __future__ import annotations

import statistics
from typing import Any, Dict, List, Optional


def peer_prior(target: Dict[str, Any], candidates: List[Dict[str, Any]], *, k: int = 5, keys=("category", "price_band", "region", "format")) -> Dict[str, Any]:
    """target and candidates are item or store descriptors with 'weekly_units' (recent weekly average). Peers match on as many keys as possible."""
    def sim(c: Dict[str, Any]) -> int:
        return sum(1 for key in keys if key in target and target.get(key) == c.get(key))
    peers = sorted((c for c in candidates if c.get("weekly_units") is not None and c["id"] != target.get("id")), key=lambda c: (-sim(c), c["id"]))[:k]
    if not peers:
        return {"weekly_units": None, "peers": [], "basis": "no peers"}
    vals = [p["weekly_units"] for p in peers]
    return {"weekly_units": round(statistics.median(vals), 3), "spread": round(statistics.pstdev(vals), 3), "peers": [p["id"] for p in peers], "basis": f"median of {len(peers)} peers matching on {max(sim(p) for p in peers)} attribute(s)"}


def blend(prior_weekly: float, observed_weeks: List[float], *, full_trust_weeks: int = 8) -> Dict[str, Any]:
    """Shift from the peer prior to the item's own history as it accumulates: weight = weeks / full_trust_weeks, capped at 1."""
    n = len(observed_weeks)
    w = min(n / full_trust_weeks, 1.0)
    own = statistics.fmean(observed_weeks) if observed_weeks else 0.0
    return {"weekly_units": round(w * own + (1 - w) * prior_weekly, 3), "weight_on_own_history": round(w, 2), "cold_start": n < full_trust_weeks}


def widen_interval(p10: float, p50: float, p90: float, weight_on_own: float, max_factor: float = 2.0) -> tuple:
    f = 1 + (max_factor - 1) * (1 - weight_on_own)
    return round(max(p50 - (p50 - p10) * f, 0.0), 3), p50, round(p50 + (p90 - p50) * f, 3)
