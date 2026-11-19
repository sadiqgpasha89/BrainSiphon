"""Analyst feedback loop: false positives and false negatives become allow-lists, block-lists, trusted-sender policy and labels. Each entry has an owner, a reason and an expiry."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional


class PolicyLists:
    def __init__(self) -> None:
        self.allow: Dict[str, Dict[str, Any]] = {}
        self.block: Dict[str, Dict[str, Any]] = {}
        self.labels: List[Dict[str, Any]] = []

    def add_allow(self, entry: str, by: str, reason: str, now: dt.datetime, days: int = 90, approver: str = "") -> None:
        """Allow-listing a whole domain is higher risk than an address and needs a second person. Every entry expires and must be re-justified."""
        if not reason:
            raise ValueError("an allow-list entry needs a reason")
        if "@" not in entry and not approver:
            raise ValueError("allow-listing a whole domain needs a second approver")
        if entry.startswith("*") or entry.count(".") == 0 and "@" not in entry:
            raise ValueError("wildcards and bare TLDs are not allowed")
        self.allow[entry.lower()] = {"by": by, "reason": reason, "approver": approver, "expires": now + dt.timedelta(days=days)}

    def is_allowed(self, sender: str, now: dt.datetime) -> bool:
        s = sender.lower()
        for k in (s, s.split("@")[-1]):
            e = self.allow.get(k)
            if e and e["expires"] > now:
                return True
        return False

    def resolve_false_positive(self, message_id: str, sender: str, analyst: str, now: dt.datetime, *, reason: str, allow: bool = False) -> None:
        self.labels.append({"message_id": message_id, "label": "benign", "kind": "false_positive", "analyst": analyst, "at": now.isoformat(), "reason": reason})
        if allow:
            self.add_allow(sender, analyst, reason, now)

    def resolve_false_negative(self, message_id: str, indicator: str, analyst: str, now: dt.datetime, *, reason: str) -> None:
        self.labels.append({"message_id": message_id, "label": "phish", "kind": "false_negative", "analyst": analyst, "at": now.isoformat(), "reason": reason})
        self.block[indicator.lower()] = {"by": analyst, "reason": reason, "at": now, "expires": now + dt.timedelta(days=30)}

    def metrics(self) -> Dict[str, int]:
        return {"false_positives": sum(1 for l in self.labels if l["kind"] == "false_positive"), "false_negatives": sum(1 for l in self.labels if l["kind"] == "false_negative"), "allow_entries": len(self.allow), "block_entries": len(self.block)}
