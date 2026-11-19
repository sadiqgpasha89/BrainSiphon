"""Recorded sales are not demand. When a shelf is empty, sales stop while demand continues; training on the raw numbers teaches the
model to forecast the stock-out. This module corrects it and estimates lost sales.

Method (deliberately simple, explainable to a planner, and replaceable by the model team's censored-demand model):
  - a store-day is *censored* if the item was out of stock for more than `min_oos_fraction` of the trading hours (from inventory
    snapshots or hourly availability), or if on-hand was zero at close with sales below the expected profile
  - demand on a censored day is estimated as sales / (share of the day's usual sales profile that was actually available)
  - when the available share is too small to extrapolate, fall back to the item's recent unconstrained median for the same weekday
Every corrected value carries `censored=True` and the method used, so the model team can choose to treat it as a lower bound."""
from __future__ import annotations

import statistics
from typing import Any, Dict, List, Optional

DEFAULT_PROFILE = [0.0] * 8 + [0.03, 0.05, 0.08, 0.10, 0.11, 0.10, 0.09, 0.08, 0.08, 0.09, 0.09, 0.07, 0.03, 0.0, 0.0, 0.0]  # trading-hour share of daily sales (24 values)


def available_share(open_hours: List[int], in_stock_hours: List[int], profile: Optional[List[float]] = None) -> float:
    prof = profile or DEFAULT_PROFILE
    total = sum(prof[h] for h in open_hours) or 1.0
    return sum(prof[h] for h in in_stock_hours if h in open_hours) / total


def correct_day(sales: float, open_hours: List[int], in_stock_hours: List[int], history_same_weekday: List[float], *, profile: Optional[List[float]] = None,
                min_oos_fraction: float = 0.15, min_share_to_extrapolate: float = 0.35) -> Dict[str, Any]:
    share = available_share(open_hours, in_stock_hours, profile)
    if 1 - share <= min_oos_fraction:
        return {"demand": sales, "censored": False, "method": "observed", "available_share": round(share, 3), "lost_sales": 0.0}
    if share >= min_share_to_extrapolate and sales > 0:
        est = sales / share
        method = "profile-extrapolation"
    elif history_same_weekday:
        est = max(sales, statistics.median(history_same_weekday))
        method = "weekday-median"
    else:
        est = sales
        method = "no-basis (lower bound only)"
    return {"demand": round(est, 3), "censored": True, "method": method, "available_share": round(share, 3), "lost_sales": round(max(est - sales, 0.0), 3)}


def lost_sales_report(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """rows: output of correct_day plus {"sku", "store", "price"}. Lost units and value by item, for the business case and the replenishment review."""
    by: Dict[str, Dict[str, float]] = {}
    for r in rows:
        k = f"{r['sku']}@{r['store']}"
        d = by.setdefault(k, {"lost_units": 0.0, "lost_value": 0.0, "censored_days": 0})
        d["lost_units"] += r["lost_sales"]
        d["lost_value"] += r["lost_sales"] * r.get("price", 0.0)
        d["censored_days"] += 1 if r["censored"] else 0
    return {"total_lost_units": round(sum(v["lost_units"] for v in by.values()), 2), "total_lost_value": round(sum(v["lost_value"] for v in by.values()), 2), "by_item": by}
