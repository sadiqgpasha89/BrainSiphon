"""Commercial valuation is a different problem from a residential AVM: it needs income, rent, occupancy and a capitalisation rate, not just comparable home sales.
This module checks that the data a commercial valuation requires is present (and refuses to value without it), and shows the direct-capitalisation arithmetic."""
from __future__ import annotations

from typing import Any, Dict, List

REQUIRED = {"office": ["gross_potential_rent", "occupancy", "operating_expenses", "cap_rate_source", "lease_roll", "area_rentable"], "retail": ["gross_potential_rent", "occupancy", "operating_expenses", "cap_rate_source", "lease_roll", "tenant_mix"],
            "multifamily": ["gross_potential_rent", "occupancy", "operating_expenses", "cap_rate_source", "unit_mix"], "industrial": ["gross_potential_rent", "occupancy", "operating_expenses", "cap_rate_source", "clear_height", "lease_roll"]}


def missing_data(kind: str, record: Dict[str, Any]) -> List[str]:
    if kind not in REQUIRED:
        raise ValueError(f"commercial type must be one of {sorted(REQUIRED)}: a residential property goes through the residential AVM")
    return [f for f in REQUIRED[kind] if record.get(f) in (None, "", [])]


def direct_capitalisation(record: Dict[str, Any], kind: str, *, cap_rate: float, vacancy_floor: float = 0.05) -> Dict[str, Any]:
    gaps = missing_data(kind, record)
    if gaps:
        return {"value": None, "reason": f"missing: {', '.join(gaps)}", "route": "commercial appraiser"}
    egi = record["gross_potential_rent"] * min(record["occupancy"], 1 - vacancy_floor)  # never assume better than the vacancy floor
    noi = egi - record["operating_expenses"]
    if noi <= 0:
        return {"value": None, "reason": "net operating income is not positive", "route": "commercial appraiser", "noi": round(noi, 0)}
    return {"value": round(noi / cap_rate, 0), "noi": round(noi, 0), "egi": round(egi, 0), "cap_rate": cap_rate, "method": "direct capitalisation", "route": "commercial appraiser review"}
