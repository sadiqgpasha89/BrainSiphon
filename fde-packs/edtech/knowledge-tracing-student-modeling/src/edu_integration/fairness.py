"""Student-group fairness assessment and institution-specific validation."""
from __future__ import annotations

import math
from typing import Any, Dict, List


def auc(y: List[int], s: List[float]) -> float:
    pos = [(sc, i) for i, (yy, sc) in enumerate(zip(y, s)) if yy == 1]
    neg = [sc for yy, sc in zip(y, s) if yy == 0]
    if not pos or not neg:
        return float("nan")
    wins = sum((1.0 if p > n else 0.5 if p == n else 0.0) for p, _ in pos for n in neg)
    return wins / (len(pos) * len(neg))


def group_report(rows: List[Dict[str, Any]], group_key: str, *, max_auc_gap: float = 0.05, max_calibration_gap: float = 0.05, min_n: int = 30) -> Dict[str, Any]:
    """rows: {"y": 0|1, "p": predicted probability, group_key: value}. Reports AUC and calibration-in-the-large per group and flags the gaps against the best group. Small groups are reported as 'too small', not as fine."""
    groups: Dict[Any, List[Dict[str, Any]]] = {}
    for r in rows:
        groups.setdefault(r[group_key], []).append(r)
    out: Dict[Any, Dict[str, Any]] = {}
    for g, rs in groups.items():
        n = len(rs)
        if n < min_n:
            out[g] = {"n": n, "status": "too small to assess"}
            continue
        a = auc([r["y"] for r in rs], [r["p"] for r in rs])
        out[g] = {"n": n, "auc": round(a, 4), "calibration_gap": round(sum(r["p"] for r in rs) / n - sum(r["y"] for r in rs) / n, 4), "status": "ok"}
    ok = {g: v for g, v in out.items() if v["status"] == "ok" and not math.isnan(v["auc"])}
    best = max((v["auc"] for v in ok.values()), default=0.0)
    flags = [{"group": g, "problem": "AUC gap", "gap": round(best - v["auc"], 4)} for g, v in ok.items() if best - v["auc"] > max_auc_gap] + [{"group": g, "problem": "calibration gap", "gap": v["calibration_gap"]} for g, v in ok.items() if abs(v["calibration_gap"]) > max_calibration_gap]
    return {"groups": out, "flags": flags, "pass": not flags, "note": "A pass is evidence for the institution's review, not a finding of fairness: the groups assessed, the thresholds and the decision are the institution's."}
