"""Patient identity reconciliation and encounter matching: the part of a clinical integration that fails quietly.

Rules: the identifier is (assigning authority, MRN); a merge re-points the old MRN to the survivor; two records that look alike but
have different identifiers are *candidates for human review*, never auto-merged; an observation is attached to an encounter by visit
number, and only falls back to a time-window match on the same patient and ward (and says it did)."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple


class Registry:
    def __init__(self) -> None:
        self.patients: Dict[Tuple[str, str], Dict[str, Any]] = {}
        self.alias: Dict[Tuple[str, str], Tuple[str, str]] = {}
        self.encounters: Dict[str, Dict[str, Any]] = {}

    def canonical(self, system: str, mrn: str) -> Tuple[str, str]:
        k = (system, mrn)
        for _ in range(10):
            if k not in self.alias:
                return k
            k = self.alias[k]
        raise RuntimeError("merge chain too long: circular merge")

    def upsert_patient(self, system: str, mrn: str, family: str, given: str, dob: str, sex: str) -> Tuple[str, str]:
        k = self.canonical(system, mrn)
        self.patients[k] = {**self.patients.get(k, {}), "family": family, "given": given, "dob": dob, "sex": sex}
        return k

    def merge(self, system: str, surviving: str, merged_away: str) -> None:
        old, new = (system, merged_away), self.canonical(system, surviving)
        if old == new:
            return
        self.alias[old] = new
        for e in self.encounters.values():
            if e["patient"] == old:
                e["patient"] = new
        if old in self.patients:
            self.patients.setdefault(new, self.patients[old])
            del self.patients[old]

    def candidates(self) -> List[Dict[str, Any]]:
        """Different identifiers, same person-looking attributes: for a human to resolve. Never auto-merged."""
        seen: Dict[tuple, List[Tuple[str, str]]] = {}
        for k, p in self.patients.items():
            seen.setdefault((p["family"].upper(), p["given"].upper()[:1], p["dob"], p["sex"]), []).append(k)
        return [{"records": v, "why": "same name, date of birth and sex under different identifiers"} for v in seen.values() if len(v) > 1]

    def open_encounter(self, visit: str, patient: Tuple[str, str], ward: str, start: dt.datetime) -> Dict[str, Any]:
        e = self.encounters.setdefault(visit, {"visit": visit, "patient": patient, "ward": ward, "start": start, "end": None, "ward_history": [(start, ward)]})
        e["patient"] = self.canonical(*patient)
        if ward != e["ward"]:
            e["ward"] = ward
            e["ward_history"].append((start, ward))
        return e

    def close_encounter(self, visit: str, end: dt.datetime) -> None:
        if visit in self.encounters:
            self.encounters[visit]["end"] = end

    def match_encounter(self, patient: Tuple[str, str], visit: str, at: dt.datetime, ward: str = "") -> Dict[str, Any]:
        """Returns {"encounter", "how"} with how in visit-number | time-window | none."""
        if visit and visit in self.encounters:
            return {"encounter": visit, "how": "visit-number"}
        p = self.canonical(*patient)
        hits = [e for e in self.encounters.values() if e["patient"] == p and e["start"] <= at and (e["end"] is None or at <= e["end"]) and (not ward or e["ward"] == ward)]
        if len(hits) == 1:
            return {"encounter": hits[0]["visit"], "how": "time-window"}
        return {"encounter": None, "how": "none" if not hits else "ambiguous"}
