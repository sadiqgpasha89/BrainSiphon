"""NEWS2 (Royal College of Physicians, 2017): the deterministic early-warning score the model falls back to when it cannot score.

Scale 1 for SpO2 (use scale 2 only when a clinician has documented hypercapnic respiratory failure). A deterministic fallback is a
clinical-safety requirement: when the model, the integration engine or the EHR link is down, the ward still has a defined rule."""
from __future__ import annotations

from typing import Dict, Optional


def _band(v: float, bands) -> int:
    for lo, hi, pts in bands:
        if lo <= v <= hi:
            return pts
    return 3


def news2(rr: Optional[float], spo2: Optional[float], on_oxygen: bool, sbp: Optional[float], hr: Optional[float], alert: bool, temp_c: Optional[float]) -> Dict[str, object]:
    parts: Dict[str, int] = {}
    missing = [n for n, v in (("rr", rr), ("spo2", spo2), ("sbp", sbp), ("hr", hr), ("temp", temp_c)) if v is None]
    if rr is not None:
        parts["rr"] = _band(rr, [(0, 8, 3), (9, 11, 1), (12, 20, 0), (21, 24, 2), (25, 99, 3)])
    if spo2 is not None:
        parts["spo2"] = _band(spo2, [(0, 91, 3), (92, 93, 2), (94, 95, 1), (96, 100, 0)])
    if on_oxygen:
        parts["oxygen"] = 2
    if sbp is not None:
        parts["sbp"] = _band(sbp, [(0, 90, 3), (91, 100, 2), (101, 110, 1), (111, 219, 0), (220, 400, 3)])
    if hr is not None:
        parts["hr"] = _band(hr, [(0, 40, 3), (41, 50, 1), (51, 90, 0), (91, 110, 1), (111, 130, 2), (131, 300, 3)])
    if not alert:
        parts["consciousness"] = 3
    if temp_c is not None:
        parts["temp"] = _band(round(temp_c, 1), [(0, 35.0, 3), (35.1, 36.0, 1), (36.1, 38.0, 0), (38.1, 39.0, 1), (39.1, 50, 2)])
    total = sum(parts.values())
    single3 = any(v == 3 for v in parts.values())
    risk = "high" if total >= 7 else "medium" if total >= 5 or single3 else "low-medium" if total >= 1 else "low"
    return {"score": total, "risk": risk, "parts": parts, "missing": missing, "complete": not missing}
