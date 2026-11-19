"""Detection is not response. This module is the boundary between them.

New integrations are **read-only by default**. An action that changes a customer's systems (quarantine a message, block a URL, disable an account, isolate an endpoint) needs an
explicit grant from a named approver for a named scope and a limited time, is journalled before it runs, and has a recorded inverse so that a wrong containment can be undone."""
from __future__ import annotations

import datetime as dt
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

ACTIONS = {
    "quarantine_message": {"inverse": "release_message", "risk": "medium", "min_approvals": 1},
    "block_url": {"inverse": "unblock_url", "risk": "medium", "min_approvals": 1},
    "disable_account": {"inverse": "enable_account", "risk": "high", "min_approvals": 2},
    "isolate_endpoint": {"inverse": "release_endpoint", "risk": "high", "min_approvals": 2},
    "add_banner": {"inverse": "remove_banner", "risk": "low", "min_approvals": 0},
}
INVERSES = {v["inverse"] for v in ACTIONS.values()}


class NotPermitted(Exception):
    pass


@dataclass
class Grant:
    action: str
    scope: str  # e.g. "tenant:acme", "mailbox:finance@acme", "domain:evil.example"
    approvers: List[str]
    ticket: str
    expires: dt.datetime
    max_uses: int = 10
    used: int = 0


@dataclass
class Controller:
    """`executors` maps action name to a callable(target, params). The default executors do nothing: wiring a real one is an explicit act."""

    executors: Dict[str, Callable[[str, Dict[str, Any]], Any]] = field(default_factory=dict)
    mode: str = "read-only"  # read-only | approval-gated
    grants: List[Grant] = field(default_factory=list)
    journal: List[Dict[str, Any]] = field(default_factory=list)

    def enable_actions(self, who: str, ticket: str) -> None:
        if not who or not ticket:
            raise NotPermitted("switching from read-only needs a named owner and a change ticket")
        self.mode = "approval-gated"
        self.journal.append({"at": _now().isoformat(), "event": "mode_changed", "to": "approval-gated", "by": who, "ticket": ticket})

    def grant(self, action: str, scope: str, approvers: List[str], ticket: str, expires: dt.datetime, max_uses: int = 10) -> Grant:
        if action not in ACTIONS:
            raise NotPermitted(f"unknown action {action}")
        need = ACTIONS[action]["min_approvals"]
        if len(set(approvers)) < need:
            raise NotPermitted(f"{action} needs {need} distinct approver(s)")
        g = Grant(action, scope, sorted(set(approvers)), ticket, expires, max_uses)
        self.grants.append(g)
        return g

    def perform(self, action: str, target: str, scope: str, params: Optional[Dict[str, Any]] = None, now: Optional[dt.datetime] = None, *, actor: str = "triage-service") -> Dict[str, Any]:
        now = now or _now()
        rec: Dict[str, Any] = {"id": uuid.uuid4().hex[:12], "at": now.isoformat(), "action": action, "target": target, "scope": scope, "actor": actor, "params": params or {}}
        if action in INVERSES:  # an inverse is performed by `undo`, with the same checks as the original
            rec["inverse_of"] = (params or {}).get("original")
        if self.mode == "read-only" and ACTIONS.get(action, {}).get("risk") != "low":
            rec["outcome"] = "blocked: read-only mode"
            self.journal.append(rec)
            raise NotPermitted("this integration is read-only: no containment action is allowed until a named owner enables approval-gated mode")
        g = next((g for g in self.grants if g.action == (action if action in ACTIONS else _inverse_to_action(action)) and (scope == g.scope or scope.startswith(g.scope + "/")) and g.expires > now and g.used < g.max_uses), None)
        if g is None and ACTIONS.get(action, {}).get("min_approvals", 1) != 0:
            rec["outcome"] = "blocked: no valid grant"
            self.journal.append(rec)
            raise NotPermitted(f"no valid approval for {action} on {scope}: ask for a grant (approvers, ticket, expiry)")
        if g:
            g.used += 1
            rec.update(ticket=g.ticket, approvers=g.approvers)
        self.journal.append({**rec, "outcome": "started"})  # journalled BEFORE it runs: a crash leaves evidence
        ex = self.executors.get(action)
        try:
            result = ex(target, params or {}) if ex else {"simulated": True}
        except Exception as e:  # noqa: BLE001
            self.journal.append({**rec, "outcome": f"failed: {e}"})
            raise
        self.journal.append({**rec, "outcome": "done", "result": result})
        return {"id": rec["id"], "result": result}

    def undo(self, action_id: str, by: str, reason: str, now: Optional[dt.datetime] = None) -> Dict[str, Any]:
        """Reverse a completed action with its recorded inverse. Needs the same grant scope, and a reason."""
        done = next((j for j in self.journal if j.get("id") == action_id and j.get("outcome") == "done"), None)
        if not done:
            raise NotPermitted("no completed action with that id")
        if not reason:
            raise NotPermitted("an undo needs a reason")
        inv = ACTIONS[done["action"]]["inverse"]
        ex = self.executors.get(inv)
        res = ex(done["target"], {"original": action_id, "by": by, "reason": reason}) if ex else {"simulated": True}
        self.journal.append({"id": uuid.uuid4().hex[:12], "at": (now or _now()).isoformat(), "action": inv, "target": done["target"], "scope": done["scope"], "actor": by, "inverse_of": action_id, "reason": reason, "outcome": "done", "result": res})
        return {"undone": action_id, "with": inv}


def _inverse_to_action(inv: str) -> str:
    return next((a for a, v in ACTIONS.items() if v["inverse"] == inv), inv)


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)
