"""Guardian consent, retention and deletion as executable workflows, not policy text."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

#: age at which a learner may consent for themselves, by jurisdiction. These are starting points: the institution's counsel confirms the rule that applies.
CONSENT_AGE = {"US-COPPA": 13, "EU-GDPR-default": 16, "UK": 13, "IN-DPDP": 18, "DEFAULT": 18}


class ConsentRequired(Exception):
    pass


@dataclass
class ConsentRecord:
    student: str
    purpose: str
    granted_by: str  # "self" or a guardian id
    at: dt.datetime
    withdrawn_at: Optional[dt.datetime] = None


class ConsentRegistry:
    def __init__(self, jurisdiction: str = "DEFAULT"):
        self.age = CONSENT_AGE.get(jurisdiction, CONSENT_AGE["DEFAULT"])
        self.records: List[ConsentRecord] = []

    def required_from(self, dob: dt.date, today: dt.date) -> str:
        years = (today - dob).days // 365.2425
        return "self" if years >= self.age else "guardian"

    def grant(self, student: str, purpose: str, by: str, dob: dt.date, now: dt.datetime) -> ConsentRecord:
        need = self.required_from(dob, now.date())
        if need == "guardian" and by == "self":
            raise ConsentRequired(f"a learner under {self.age} needs guardian consent")
        r = ConsentRecord(student, purpose, by, now)
        self.records.append(r)
        return r

    def withdraw(self, student: str, purpose: str, now: dt.datetime) -> int:
        n = 0
        for r in self.records:
            if r.student == student and r.purpose == purpose and not r.withdrawn_at:
                r.withdrawn_at = now
                n += 1
        return n

    def has(self, student: str, purpose: str) -> bool:
        return any(r.student == student and r.purpose == purpose and not r.withdrawn_at for r in self.records)

    def gate(self, student: str, purpose: str) -> None:
        """Called in front of any processing that needs consent. A learner without consent for the purpose is not modelled."""
        if not self.has(student, purpose):
            raise ConsentRequired(f"no consent for {purpose!r}: do not process this learner")


class Stores:
    """Every store that holds learner data registers a deletion hook and a retention period. A deletion request that misses a store is a defect, so the list is enumerated and tested."""

    def __init__(self) -> None:
        self.stores: Dict[str, Dict[str, Any]] = {}

    def register(self, name: str, delete: Callable[[str], int], retention_days: Optional[int], purge_expired: Optional[Callable[[dt.datetime], int]] = None) -> None:
        self.stores[name] = {"delete": delete, "retention_days": retention_days, "purge": purge_expired}

    def delete_learner(self, student: str, requested_by: str, now: dt.datetime) -> Dict[str, Any]:
        report = {"student": student, "requested_by": requested_by, "at": now.isoformat(), "stores": {}, "complete": True}
        for name, s in self.stores.items():
            try:
                report["stores"][name] = {"deleted": s["delete"](student)}
            except Exception as e:  # noqa: BLE001
                report["stores"][name] = {"error": str(e)}
                report["complete"] = False
        return report

    def run_retention(self, now: dt.datetime) -> Dict[str, int]:
        return {n: s["purge"](now - dt.timedelta(days=s["retention_days"])) for n, s in self.stores.items() if s["purge"] and s["retention_days"]}
