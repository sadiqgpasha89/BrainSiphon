"""Branch-manager approval before any schedule change is applied, with a diff the manager can read and an audit trail."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional


class ApprovalError(Exception):
    pass


def diff(current: List[Dict[str, Any]], proposed: List[Dict[str, Any]]) -> Dict[str, Any]:
    key = lambda s: (s["emp"], s["date"])  # noqa: E731
    cur, pro = {key(s): s for s in current}, {key(s): s for s in proposed}
    return {"added": [pro[k] for k in pro if k not in cur], "removed": [cur[k] for k in cur if k not in pro], "changed": [{"from": cur[k], "to": pro[k]} for k in pro if k in cur and (cur[k]["start"], cur[k]["end"]) != (pro[k]["start"], pro[k]["end"])]}


class Proposal:
    def __init__(self, pid: str, branch: str, week: str, current: List[Dict[str, Any]], proposed: List[Dict[str, Any]], legal: bool, expected: Dict[str, Any]):
        self.id, self.branch, self.week = pid, branch, week
        self.diff = diff(current, proposed)
        self.legal, self.expected = legal, expected  # expected: {"labour_cost_delta", "waiting_time_change_pct", ...}
        self.status, self.history = "pending-manager-approval", [("created", "system", dt.datetime.now(dt.timezone.utc).isoformat(), "")]
        self.proposed = proposed

    def approve(self, manager: str, branch_of_manager: str, now: dt.datetime, note: str = "") -> None:
        if branch_of_manager != self.branch:
            raise ApprovalError("only the manager of this branch (or a delegated regional manager) can approve")
        if not self.legal:
            raise ApprovalError("a roster with labour-rule violations cannot be approved: fix the violations first")
        if self.status != "pending-manager-approval":
            raise ApprovalError(f"proposal is {self.status}")
        self.status = "approved"
        self.history.append(("approved", manager, now.isoformat(), note))

    def reject(self, manager: str, reason: str, now: dt.datetime) -> None:
        if not reason:
            raise ApprovalError("a rejection needs a reason: it is the feedback the model learns from")
        self.status = "rejected"
        self.history.append(("rejected", manager, now.isoformat(), reason))

    def amend(self, manager: str, shifts: List[Dict[str, Any]], legal: bool, now: dt.datetime, reason: str) -> None:
        """The manager edits the proposal: the edit is an override, recorded with its reason, and the result must itself be legal."""
        if not legal:
            raise ApprovalError("the amended roster has labour-rule violations")
        self.proposed, self.legal = shifts, legal
        self.history.append(("amended", manager, now.isoformat(), reason))
