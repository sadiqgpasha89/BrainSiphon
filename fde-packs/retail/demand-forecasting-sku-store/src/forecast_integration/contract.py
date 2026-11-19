"""The forecast output contract, versioning, planner overrides, approval, and the step from forecast to replenishment proposal.

A forecast is consumed by replenishment and procurement, not by a storefront. What they need is a quantity per SKU-store-date with
an interval and a version, plus a controlled way for a planner to change it and for a buyer to approve the order that results."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

FORECAST_SCHEMA = {
    "type": "object", "required": ["sku", "store", "forecast_date", "horizon_days", "predicted_units", "p10", "p90", "model_version", "run_id", "generated_at"],
    "properties": {"sku": {"type": "string"}, "store": {"type": "string"}, "forecast_date": {"type": "string", "format": "date"}, "horizon_days": {"type": "integer", "minimum": 1, "maximum": 365},
                   "predicted_units": {"type": "number", "minimum": 0}, "p10": {"type": "number", "minimum": 0}, "p50": {"type": "number", "minimum": 0}, "p90": {"type": "number", "minimum": 0},
                   "uom": {"type": "string"}, "trading_day": {"type": "boolean"}, "model_version": {"type": "string"}, "run_id": {"type": "string"}, "generated_at": {"type": "string", "format": "date-time"},
                   "cold_start": {"type": "boolean"}, "override": {"type": ["object", "null"]}}}


def validate_row(r: Dict[str, Any]) -> List[str]:
    errs = []
    for k in FORECAST_SCHEMA["required"]:
        if k not in r or r[k] in (None, ""):
            errs.append(f"{k} is required")
    if not errs:
        if not (r["p10"] <= r["predicted_units"] <= r["p90"]):
            errs.append("quantiles must satisfy p10 <= predicted_units <= p90")
        if r["predicted_units"] < 0:
            errs.append("predicted_units cannot be negative")
        try:
            dt.date.fromisoformat(r["forecast_date"])
        except ValueError:
            errs.append("forecast_date must be an ISO date (store-local business date)")
    return errs


def run_manifest(rows: List[Dict[str, Any]], run_id: str, model_version: str) -> Dict[str, Any]:
    """The `_SUCCESS` manifest written last: consumers read a run only when it exists and its checksum matches."""
    body = "\n".join(json.dumps(r, sort_keys=True) for r in rows)
    return {"run_id": run_id, "model_version": model_version, "rows": len(rows), "skus": len({r["sku"] for r in rows}), "stores": len({r["store"] for r in rows}), "sha256": hashlib.sha256(body.encode()).hexdigest(), "contract": "forecast-output.v1"}


def verify_manifest(rows: List[Dict[str, Any]], m: Dict[str, Any]) -> bool:
    return run_manifest(rows, m["run_id"], m["model_version"])["sha256"] == m["sha256"] and len(rows) == m["rows"]


@dataclass
class Override:
    sku: str
    store: str
    forecast_date: str
    new_units: float
    reason: str  # promo_not_in_calendar | local_event | supply_constraint | data_error | new_product_knowledge | other
    planner: str
    approved_by: str = ""
    at: str = ""


class OverrideLog:
    """Planner overrides are first-class data: who, why, how much, who approved, and what happened to accuracy afterwards."""

    REASONS = {"promo_not_in_calendar", "local_event", "supply_constraint", "data_error", "new_product_knowledge", "other"}

    def __init__(self, max_change_ratio: float = 0.5, approval_above_ratio: float = 0.25):
        self.items: List[Override] = []
        self.max_change_ratio, self.approval_above_ratio = max_change_ratio, approval_above_ratio

    def propose(self, row: Dict[str, Any], new_units: float, reason: str, planner: str, now: Optional[dt.datetime] = None) -> Override:
        if reason not in self.REASONS:
            raise ValueError(f"reason must be one of {sorted(self.REASONS)}")
        base = max(row["predicted_units"], 1e-9)
        ratio = abs(new_units - row["predicted_units"]) / base
        if ratio > self.max_change_ratio:
            raise ValueError(f"a change of {ratio:.0%} exceeds the {self.max_change_ratio:.0%} limit: escalate to the category manager")
        o = Override(row["sku"], row["store"], row["forecast_date"], new_units, reason, planner, at=(now or dt.datetime.now(dt.timezone.utc)).isoformat())
        o.approved_by = "" if ratio > self.approval_above_ratio else "auto (within tolerance)"
        self.items.append(o)
        return o

    def approve(self, o: Override, approver: str) -> None:
        if approver == o.planner:
            raise ValueError("the approver cannot be the planner who proposed the override")
        o.approved_by = approver

    def apply(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        idx = {(o.sku, o.store, o.forecast_date): o for o in self.items if o.approved_by}
        out = []
        for r in rows:
            o = idx.get((r["sku"], r["store"], r["forecast_date"]))
            out.append({**r, "predicted_units": o.new_units, "override": {"from": r["predicted_units"], "reason": o.reason, "planner": o.planner, "approved_by": o.approved_by}} if o else r)
        return out


def replenishment_proposal(row: Dict[str, Any], *, on_hand: float, on_order: float, lead_time_days: int, review_days: int, pack_size: int, min_order: int = 0, service_level_p: str = "p90",
                           horizon_daily: Optional[List[float]] = None) -> Dict[str, Any]:
    """Forecast -> a purchase-order *proposal*: demand over lead time plus review period, safety stock from the interval, minus position, rounded to pack size.
    The buyer approves it; nothing here creates an order."""
    days = lead_time_days + review_days
    daily = horizon_daily[:days] if horizon_daily else [row["predicted_units"]] * days
    demand = sum(daily)
    spread = max(row.get(service_level_p, row["predicted_units"]) - row["predicted_units"], 0.0)
    safety = spread * math.sqrt(days)
    need = max(demand + safety - on_hand - on_order, 0.0)
    qty = 0 if need <= 0 else max(math.ceil(need / pack_size) * pack_size, min_order)
    return {"sku": row["sku"], "store": row["store"], "proposed_qty": qty, "basis": {"demand_over_cover": round(demand, 2), "safety_stock": round(safety, 2), "position": on_hand + on_order, "cover_days": days}, "status": "proposed", "needs_buyer_approval": True}
