"""How comparable sales are selected, adjusted and presented for human review, and when a valuation is withheld or escalated."""
from __future__ import annotations

import datetime as dt
import math
import statistics
from typing import Any, Dict, List, Optional, Tuple


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    (la1, lo1), (la2, lo2) = [(math.radians(x), math.radians(y)) for x, y in (a, b)]
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


def similarity(subject: Dict[str, Any], c: Dict[str, Any], today: dt.date, *, max_km: float = 3.0, max_age_days: int = 270) -> Optional[float]:
    """0..1, or None when the sale is not eligible (wrong type, too far, too old). Each factor has a stated weight a reviewer can read."""
    if c.get("property_type") != subject.get("property_type") or c.get("property_subtype") != subject.get("property_subtype"):
        return None
    km = haversine_km((subject["lat"], subject["lon"]), (c["lat"], c["lon"]))
    age = (today - dt.date.fromisoformat(c["sale_date"])).days
    if km > max_km or age > max_age_days or age < 0:
        return None
    size = 1 - min(abs(c["living_area"] - subject["living_area"]) / subject["living_area"], 1)
    beds = 1.0 if c["bedrooms"] == subject["bedrooms"] else 0.6 if abs(c["bedrooms"] - subject["bedrooms"]) == 1 else 0.2
    yr = 1 - min(abs(c["year_built"] - subject["year_built"]) / 50, 1)
    return round(0.30 * (1 - km / max_km) + 0.25 * (1 - age / max_age_days) + 0.25 * size + 0.10 * beds + 0.10 * yr, 4)


def adjust(subject: Dict[str, Any], c: Dict[str, Any], *, price_per_sqft: float, per_bedroom: float = 8000.0, per_year: float = 400.0, gross_cap: float = 0.25, net_cap: float = 0.15) -> Dict[str, Any]:
    """Adjust the comparable's price to the subject. Standard underwriting guardrails: gross adjustments over 25% or net over 15% make the comparable a poor one: it is flagged and excluded from the median, not silently used."""
    adjs = {"size": round((subject["living_area"] - c["living_area"]) * price_per_sqft, 0), "bedrooms": (subject["bedrooms"] - c["bedrooms"]) * per_bedroom, "age": (subject["year_built"] - c["year_built"]) * per_year}
    net = sum(adjs.values())
    gross = sum(abs(v) for v in adjs.values())
    adjusted = c["sale_price"] + net
    ok = gross / c["sale_price"] <= gross_cap and abs(net) / c["sale_price"] <= net_cap
    return {"listing_id": c["listing_id"], "sale_price": c["sale_price"], "adjustments": adjs, "net": net, "gross": gross, "adjusted_price": round(adjusted, 0), "gross_pct": round(gross / c["sale_price"], 3), "net_pct": round(net / c["sale_price"], 3), "usable": ok}


def select_and_value(subject: Dict[str, Any], candidates: List[Dict[str, Any]], today: dt.date, *, k: int = 6, price_per_sqft: Optional[float] = None) -> Dict[str, Any]:
    scored = sorted(((similarity(subject, c, today), c) for c in candidates), key=lambda x: (x[0] is None, -(x[0] or 0)))
    elig = [(s, c) for s, c in scored if s is not None][:k]
    if not elig:
        return {"value": None, "reason": "no eligible comparables within the distance and recency limits", "comparables": []}
    ppsf = price_per_sqft or statistics.median(c["sale_price"] / c["living_area"] for _, c in elig)
    rows = [{**adjust(subject, c, price_per_sqft=ppsf), "similarity": s, "distance_km": round(haversine_km((subject["lat"], subject["lon"]), (c["lat"], c["lon"])), 2), "sale_date": c["sale_date"]} for s, c in elig]
    usable = [r for r in rows if r["usable"]]
    if len(usable) < 3:
        return {"value": None, "reason": f"only {len(usable)} usable comparable(s) after adjustment limits (3 required)", "comparables": rows}
    adj = sorted(r["adjusted_price"] for r in usable)
    w = [r["similarity"] for r in usable]
    value = sum(r["adjusted_price"] * wi for r, wi in zip(usable, w)) / sum(w)
    spread = (adj[-1] - adj[0]) / value
    return {"value": round(value, 0), "low": adj[0], "high": adj[-1], "range_pct": round(spread, 3), "comparables": rows, "n_usable": len(usable)}


def confidence(valuation: Dict[str, Any], *, model_value: Optional[float] = None, max_range_pct: float = 0.20, max_model_gap: float = 0.12, min_comps: int = 3) -> Dict[str, Any]:
    """Confidence score and the escalation decision. Low confidence goes to a human appraiser with the reasons; it is never shown as a falsely precise value."""
    reasons: List[str] = []
    if valuation.get("value") is None:
        return {"score": 0.0, "level": "none", "route": "human appraiser", "reasons": [valuation["reason"]]}
    if valuation["range_pct"] > max_range_pct:
        reasons.append(f"comparable range is {valuation['range_pct']:.0%}, above {max_range_pct:.0%}")
    if valuation["n_usable"] < min_comps + 1:
        reasons.append(f"only {valuation['n_usable']} usable comparables")
    if model_value and abs(model_value - valuation["value"]) / valuation["value"] > max_model_gap:
        reasons.append(f"the ML value differs from the comparable value by {abs(model_value - valuation['value']) / valuation['value']:.0%}")
    score = round(max(0.0, 1 - valuation["range_pct"] * 2 - 0.1 * len(reasons)), 3)
    level = "high" if score >= 0.75 and not reasons else "medium" if score >= 0.5 else "low"
    return {"score": score, "level": level, "route": "automated" if level == "high" else "human appraiser" if level == "low" else "analyst review", "reasons": reasons}
