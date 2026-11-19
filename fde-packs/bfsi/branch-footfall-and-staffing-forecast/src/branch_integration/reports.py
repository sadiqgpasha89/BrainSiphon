"""Branch-level accuracy, overrides and actual outcomes: the feedback loop for the forecast and the staffing recommendation."""
from __future__ import annotations

import statistics
from typing import Any, Dict, List


def wape(actual: List[float], forecast: List[float]) -> float:
    tot = sum(actual)
    return round(sum(abs(a - f) for a, f in zip(actual, forecast)) / tot, 4) if tot else float("nan")


def branch_report(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """rows: {"branch","hour_index","actual","p50","p90","imputed" (bool)}. Per branch: WAPE, bias, peak-hour error, P90 coverage, and how much of the data was imputed."""
    by: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        by.setdefault(r["branch"], []).append(r)
    out = {}
    for b, rs in by.items():
        clean = [r for r in rs if not r.get("imputed")]
        a, f = [r["actual"] for r in clean], [r["p50"] for r in clean]
        if not clean:
            out[b] = {"status": "no clean actuals"}
            continue
        peak = max(clean, key=lambda r: r["actual"])
        out[b] = {"hours": len(clean), "wape": wape(a, f), "bias": round(sum(f) / sum(a) - 1, 4) if sum(a) else None, "peak_error": round(peak["p50"] - peak["actual"], 2), "p90_coverage": round(sum(1 for r in clean if r["actual"] <= r["p90"]) / len(clean), 3), "imputed_share": round(1 - len(clean) / len(rs), 3)}
    worst = sorted((b for b, v in out.items() if "wape" in v), key=lambda b: -out[b]["wape"])[:3]
    return {"branches": out, "worst_by_wape": worst}


def override_feedback(proposals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """proposals: {"status", "reason", "extra_shifts", "removed_shifts"}: how often managers accept, amend or reject, and why."""
    n = len(proposals) or 1
    reasons: Dict[str, int] = {}
    for p in proposals:
        if p["status"] in ("rejected", "amended"):
            reasons[p.get("reason", "none")] = reasons.get(p.get("reason", "none"), 0) + 1
    return {"proposals": len(proposals), "accepted_as_is": round(sum(1 for p in proposals if p["status"] == "approved") / n, 3), "amended": round(sum(1 for p in proposals if p["status"] == "amended") / n, 3), "rejected": round(sum(1 for p in proposals if p["status"] == "rejected") / n, 3), "top_reasons": sorted(reasons.items(), key=lambda kv: -kv[1])[:5]}
