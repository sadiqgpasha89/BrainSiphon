"""Footfall data quality: sensor failures, imputation, identifier and time-zone reconciliation, branch calendars, and cold-start priors.

A branch with a dead sensor looks empty, and an empty branch gets fewer staff. These functions exist to stop that failure before it reaches the forecast."""
from __future__ import annotations

import datetime as dt
import statistics
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo


def detect_sensor_failures(counts: List[Optional[int]], tickets: Optional[List[int]] = None, *, flatline_hours: int = 4, open_mask: Optional[List[bool]] = None) -> List[Dict[str, Any]]:
    """Hour-by-hour: missing value; zero while the queue system issued tickets; a flat run of identical non-zero values; and a value far below tickets (a partly blocked sensor)."""
    n = len(counts)
    om = open_mask or [True] * n
    flags: List[Dict[str, Any]] = []
    for i, c in enumerate(counts):
        if not om[i]:
            continue
        if c is None:
            flags.append({"i": i, "why": "missing"})
        elif tickets is not None and c == 0 and tickets[i] > 2:
            flags.append({"i": i, "why": f"zero visitors counted while {tickets[i]} queue tickets were issued"})
        elif tickets is not None and tickets[i] >= 10 and c < 0.3 * tickets[i]:
            flags.append({"i": i, "why": f"counted {c} against {tickets[i]} tickets: sensor partly blocked"})
    run = 1
    for i in range(1, n):
        if counts[i] is not None and counts[i] == counts[i - 1] and counts[i] != 0 and om[i]:
            run += 1
            if run == flatline_hours:
                flags.extend({"i": j, "why": f"flat run of {counts[i]} for {flatline_hours}+ hours"} for j in range(i - run + 1, i + 1))
            elif run > flatline_hours:
                flags.append({"i": i, "why": f"flat run of {counts[i]} for {flatline_hours}+ hours"})
        else:
            run = 1
    seen, out = set(), []
    for f in sorted(flags, key=lambda f: f["i"]):
        if f["i"] not in seen:
            seen.add(f["i"])
            out.append(f)
    return out


def impute(counts: List[Optional[int]], flags: List[Dict[str, Any]], tickets: Optional[List[int]] = None, same_hour_last_week: Optional[List[Optional[int]]] = None) -> Dict[str, Any]:
    """Fill flagged hours and mark them so the forecast widens its interval there. Order of preference: the visitors-per-ticket ratio of healthy hours x today's tickets; then the same hour last week."""
    bad = {f["i"] for f in flags}
    good = [i for i, c in enumerate(counts) if i not in bad and c is not None and tickets is not None and tickets[i] > 0]
    ratio = statistics.median(counts[i] / tickets[i] for i in good) if good else None  # type: ignore[operator]
    out: List[Optional[float]] = list(counts)  # type: ignore[assignment]
    method: Dict[int, str] = {}
    for i in sorted(bad):
        if ratio is not None and tickets is not None and tickets[i] > 0:
            out[i], method[i] = round(ratio * tickets[i], 1), "ticket-ratio"
        elif same_hour_last_week and same_hour_last_week[i] is not None:
            out[i], method[i] = float(same_hour_last_week[i]), "same hour last week"
        else:
            out[i], method[i] = None, "no basis: left missing"
    return {"values": out, "imputed": method, "interval_widen_factor": {i: (1.5 if m == "ticket-ratio" else 2.0) for i, m in method.items()}}


class BranchMaster:
    """One canonical branch id; every system's identifier (queue system, HR, WFM, sensors, GL cost centre) resolves to it. Unknown identifiers are reported, never guessed."""

    def __init__(self, branches: List[Dict[str, Any]]):
        self.by_alias: Dict[str, str] = {}
        self.branches = {b["branch_id"]: b for b in branches}
        for b in branches:
            for system, ids in b.get("aliases", {}).items():
                for i in ids:
                    key = f"{system}:{i}".upper()
                    if key in self.by_alias and self.by_alias[key] != b["branch_id"]:
                        raise ValueError(f"alias {key} is claimed by two branches")
                    self.by_alias[key] = b["branch_id"]

    def resolve(self, system: str, ident: str) -> Optional[str]:
        return self.by_alias.get(f"{system}:{ident}".upper())

    def local_hour(self, branch_id: str, ts_utc: dt.datetime) -> Dict[str, Any]:
        """Convert UTC to the branch's local clock and say when the hour is ambiguous (clocks going back) or does not exist (clocks going forward)."""
        tz = ZoneInfo(self.branches[branch_id]["timezone"])
        local = ts_utc.astimezone(tz)
        fold_info = ts_utc.astimezone(tz).replace(tzinfo=None)
        a = fold_info.replace(tzinfo=tz, fold=0).utcoffset()
        b = fold_info.replace(tzinfo=tz, fold=1).utcoffset()
        return {"local": local, "hour": local.hour, "date": local.date(), "ambiguous": a != b}


class Calendar:
    def __init__(self, hours: Dict[int, Tuple[int, int]], holidays: Optional[set] = None, closures: Optional[List[Tuple[dt.date, dt.date, str]]] = None):
        self.hours, self.holidays, self.closures = hours, holidays or set(), closures or []  # hours: weekday -> (open_hour, close_hour)

    def is_open(self, d: dt.date, hour: int) -> bool:
        if d in self.holidays or any(s <= d <= e for s, e, _ in self.closures) or d.weekday() not in self.hours:
            return False
        o, c = self.hours[d.weekday()]
        return o <= hour < c

    def exclusion_reason(self, d: dt.date) -> str:
        for s, e, r in self.closures:
            if s <= d <= e:
                return r
        return "holiday" if d in self.holidays else ""


def cold_start(new_branch: Dict[str, Any], peers: List[Dict[str, Any]], k: int = 3) -> Dict[str, Any]:
    """A new or renovated branch borrows an hourly profile from its closest peers (same format and region, nearest catchment size), scaled by catchment size."""
    cand = sorted((p for p in peers if p["format"] == new_branch["format"]), key=lambda p: (p["region"] != new_branch["region"], abs(p["catchment"] - new_branch["catchment"])))[:k]
    if not cand:
        return {"profile": None, "peers": []}
    scale = [new_branch["catchment"] / p["catchment"] for p in cand]
    profile = [round(statistics.fmean(p["hourly"][h] * s for p, s in zip(cand, scale)), 2) for h in range(len(cand[0]["hourly"]))]
    return {"profile": profile, "peers": [p["id"] for p in cand], "basis": f"{len(cand)} peers of the same format, scaled by catchment"}
