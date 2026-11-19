"""Human approval before high-impact ticket actions."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional

HIGH_IMPACT = {"set_priority_p1": 1, "close_ticket": 1, "merge_tickets": 1, "send_public_reply": 1, "issue_credit": 2, "reassign_to_executive": 1}
LOW_IMPACT = {"set_category", "set_priority_p2_p4", "add_tag", "add_internal_note", "route_to_queue"}


class Rejected(Exception):
    pass


class ApprovalQueue:
    def __init__(self, ttl: dt.timedelta = dt.timedelta(hours=2)):
        self.ttl = ttl
        self.items: Dict[str, Dict[str, Any]] = {}

    def needs_approval(self, action: str) -> bool:
        if action in LOW_IMPACT:
            return False
        if action in HIGH_IMPACT:
            return True
        return True  # an action nobody classified is treated as high impact

    def request(self, rid: str, action: str, ticket: str, proposed_by: str, now: dt.datetime, why: str) -> Dict[str, Any]:
        self.items[rid] = {"id": rid, "action": action, "ticket": ticket, "proposed_by": proposed_by, "why": why, "at": now, "approvals": [], "status": "pending", "need": HIGH_IMPACT.get(action, 1)}
        return self.items[rid]

    def approve(self, rid: str, by: str, now: dt.datetime) -> Dict[str, Any]:
        it = self.items[rid]
        if now - it["at"] > self.ttl:
            it["status"] = "expired"
            raise Rejected("the request expired: re-propose it with current ticket state")
        if by == it["proposed_by"] or by in it["approvals"]:
            raise Rejected("approver must be a different person each time")
        it["approvals"].append(by)
        if len(it["approvals"]) >= it["need"]:
            it["status"] = "approved"
        return it

    def reject(self, rid: str, by: str, reason: str) -> None:
        self.items[rid].update(status="rejected", rejected_by=by, reason=reason)

    def executable(self, rid: str) -> bool:
        return self.items[rid]["status"] == "approved"
