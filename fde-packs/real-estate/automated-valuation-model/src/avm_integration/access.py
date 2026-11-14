"""Who may see a valuation, its comparables and the licensed data behind them."""
from __future__ import annotations

from typing import Dict, Set

ROLES = ("broker", "appraiser", "portfolio_manager", "analyst", "underwriter", "borrower")
#: what each role may see: the valuation, its range, the comparables (which carry licensed MLS data), and the model internals
MATRIX: Dict[str, Set[str]] = {
    "broker": {"value", "range", "comparables_summary"},
    "appraiser": {"value", "range", "comparables", "comparables_summary", "adjustments", "model_explanation", "challenge"},
    "portfolio_manager": {"value", "range", "comparables_summary", "portfolio_view"},
    "analyst": {"value", "range", "comparables", "comparables_summary", "adjustments", "model_explanation", "portfolio_view"},
    "underwriter": {"value", "range", "comparables_summary", "confidence", "challenge"},
    "borrower": {"value_range_only"},
}


def can(role: str, what: str) -> bool:
    return what in MATRIX.get(role, set())


def redact(valuation: dict, role: str) -> dict:
    """The valuation as the role may see it. Licensed listing data (comparables with MLS fields) is removed from roles that may not receive it."""
    out: dict = {}
    if can(role, "value"):
        out.update(value=valuation["value"], low=valuation.get("low"), high=valuation.get("high"))
    if can(role, "value_range_only"):
        out.update(low=valuation.get("low"), high=valuation.get("high"))
    if can(role, "confidence"):
        out["confidence"] = valuation.get("confidence")
    if can(role, "comparables"):
        out["comparables"] = valuation.get("comparables")
    elif can(role, "comparables_summary"):
        out["comparables_summary"] = {"n": len(valuation.get("comparables") or []), "range_pct": valuation.get("range_pct")}
    if can(role, "adjustments"):
        out["adjustments"] = [c.get("adjustments") for c in valuation.get("comparables", [])]
    return out
