"""MLS data licensing, attribution and redistribution restrictions, enforced in the connector and audited.

MLS data is licensed, not owned. Each MLS (and often each use: valuation, display, redistribution) has terms: which fields may be stored, whether they may be shown to third parties, the attribution that must accompany them, and how long they may be kept.
The terms are configuration (`market_packs/*.json`), and the code refuses to do what the licence does not allow."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Set


class LicenceViolation(Exception):
    pass


class Licence:
    def __init__(self, mls: str, *, uses: Set[str], fields_by_use: Dict[str, Set[str]], attribution: str, redistribute: bool, retention_days: Optional[int], status: str = "active", expires: Optional[dt.date] = None):
        self.mls, self.uses, self.fields_by_use, self.attribution, self.redistribute, self.retention_days, self.status, self.expires = mls, uses, fields_by_use, attribution, redistribute, retention_days, status, expires
        self.audit: List[Dict[str, Any]] = []

    def check_active(self, today: dt.date) -> None:
        if self.status != "active" or (self.expires and self.expires < today):
            raise LicenceViolation(f"licence for {self.mls} is {self.status if self.status != 'active' else 'expired'}: no data may be accessed")

    def filter(self, record: Dict[str, Any], use: str, user: str, today: dt.date) -> Dict[str, Any]:
        """Return only the fields this use may see, record the access, and refuse a use the licence does not cover."""
        self.check_active(today)
        if use not in self.uses:
            raise LicenceViolation(f"use '{use}' is not licensed by {self.mls} (licensed: {sorted(self.uses)})")
        allowed = self.fields_by_use[use]
        out = {k: v for k, v in record.items() if k in allowed}
        self.audit.append({"at": today.isoformat(), "mls": self.mls, "user": user, "use": use, "listing": record.get("ListingKey"), "fields": sorted(out)})
        return out

    def publish(self, payload: Dict[str, Any], audience: str, today: dt.date) -> Dict[str, Any]:
        """Anything that leaves the institution (a portal, a broker tool, a borrower letter) must carry the attribution, and only when redistribution is allowed."""
        self.check_active(today)
        if audience == "external" and not self.redistribute:
            raise LicenceViolation(f"{self.mls} data may not be redistributed to external audiences: show the valuation, not the underlying listing data")
        out = dict(payload)
        out["attribution"] = self.attribution
        self.audit.append({"at": today.isoformat(), "mls": self.mls, "audience": audience, "published_fields": sorted(payload)})
        return out

    def purge_due(self, stored: List[Dict[str, Any]], today: dt.date) -> List[str]:
        if not self.retention_days:
            return []
        return [r["ListingKey"] for r in stored if (today - dt.date.fromisoformat(r["_retrieved"])).days > self.retention_days]
