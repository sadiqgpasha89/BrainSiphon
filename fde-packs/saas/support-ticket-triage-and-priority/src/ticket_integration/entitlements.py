"""Customer entitlements, the priority matrix, routing and escalation, as customer-specific configuration rather than model output."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional

TIERS = ("free", "standard", "premium", "enterprise")
# (first response minutes, resolution hours) by tier and priority
SLA = {"enterprise": {"P1": (15, 4), "P2": (60, 8), "P3": (240, 48), "P4": (480, 120)}, "premium": {"P1": (30, 8), "P2": (120, 24), "P3": (480, 72), "P4": (960, 168)},
       "standard": {"P1": (120, 24), "P2": (480, 48), "P3": (960, 96), "P4": (1920, 240)}, "free": {"P1": (480, 48), "P2": (1440, 96), "P3": (2880, 168), "P4": (5760, 336)}}


class Entitlements:
    """Account tier, subscription status and contractual SLA come from the CRM/billing system (Salesforce, HubSpot, billing), joined on the organisation id with an explicit staleness bound."""

    def __init__(self, accounts: Dict[str, Dict[str, Any]], max_age: dt.timedelta = dt.timedelta(hours=24)):
        self.accounts, self.max_age = accounts, max_age

    def lookup(self, org_id: str, now: dt.datetime) -> Dict[str, Any]:
        a = self.accounts.get(org_id)
        if not a:
            return {"tier": "standard", "status": "unknown", "source": "default (account not found)", "contract_sla": None}
        stale = now - a["as_of"] > self.max_age
        return {"tier": a["tier"] if a.get("status") == "active" else "free", "status": a.get("status", "unknown"), "contract_sla": a.get("contract_sla"), "source": "crm" + (" (stale)" if stale else ""), "stale": stale}


def priority(urgency: str, impact: str, tier: str, *, outage: bool = False) -> str:
    """The customer's priority matrix. Urgency (low/medium/high) x impact (single user/team/everyone) gives a base; tier raises it by at most one level; an outage is always P1."""
    if outage:
        return "P1"
    u = {"low": 0, "medium": 1, "high": 2}[urgency]
    i = {"single": 0, "team": 1, "everyone": 2}[impact]
    base = {0: "P4", 1: "P4", 2: "P3", 3: "P2", 4: "P1"}[u + i]
    order = ["P4", "P3", "P2", "P1"]
    bump = 1 if tier in ("premium", "enterprise") and base != "P1" and u + i >= 2 else 0
    return order[min(order.index(base) + bump, 3)]


def sla_for(ent: Dict[str, Any], prio: str) -> Dict[str, Any]:
    if ent.get("contract_sla") and prio in ent["contract_sla"]:
        fr, res = ent["contract_sla"][prio]
        return {"first_response_min": fr, "resolution_h": res, "basis": "contract"}
    fr, res = SLA[ent["tier"]][prio]
    return {"first_response_min": fr, "resolution_h": res, "basis": f"tier {ent['tier']}"}


def route(ticket: Dict[str, Any], rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    """First matching rule wins; rules are ordered by the support operations owner. No match goes to the triage queue, never nowhere."""
    for r in rules:
        m = r["when"]
        if all((ticket.get(k) in v) if isinstance(v, list) else ticket.get(k) == v for k, v in m.items()):
            return {"queue": r["queue"], "rule": r.get("name", ""), "skills": r.get("skills", [])}
    return {"queue": "triage", "rule": "default", "skills": []}


def escalation(ticket_created: dt.datetime, prio: str, sla: Dict[str, Any], now: dt.datetime, first_responded: bool, policy: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Time to breach and who is told at which fraction of the SLA (default: warn at 75%, escalate to the team lead at 100%, to the duty manager at 150%)."""
    policy = policy or {"warn": 0.75, "lead": 1.0, "manager": 1.5}
    target = dt.timedelta(minutes=sla["first_response_min"]) if not first_responded else dt.timedelta(hours=sla["resolution_h"])
    used = (now - ticket_created) / target
    level = "manager" if used >= policy["manager"] else "lead" if used >= policy["lead"] else "warn" if used >= policy["warn"] else "none"
    return {"fraction_used": round(used, 2), "level": level, "breach_at": (ticket_created + target).isoformat(), "clock": "first_response" if not first_responded else "resolution"}
