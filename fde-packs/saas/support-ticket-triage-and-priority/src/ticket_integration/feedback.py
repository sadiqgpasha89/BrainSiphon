"""Capturing human corrections and resolution outcomes, and the operational metrics the support team judges the system by."""
from __future__ import annotations

import datetime as dt
import statistics
from typing import Any, Dict, List


class FeedbackStore:
    def __init__(self) -> None:
        self.corrections: List[Dict[str, Any]] = []

    def record(self, ticket: str, field: str, model_value: Any, agent_value: Any, agent: str, now: dt.datetime) -> None:
        self.corrections.append({"ticket": ticket, "field": field, "model": model_value, "agent": agent_value, "agent_id": agent, "at": now.isoformat(), "accepted": model_value == agent_value})

    def acceptance(self) -> Dict[str, Any]:
        by: Dict[str, List[bool]] = {}
        for c in self.corrections:
            by.setdefault(c["field"], []).append(c["accepted"])
        return {f: {"n": len(v), "agent_acceptance": round(sum(v) / len(v), 3)} for f, v in by.items()}

    def confusions(self, field: str) -> List[Dict[str, Any]]:
        from collections import Counter
        c = Counter((x["model"], x["agent"]) for x in self.corrections if x["field"] == field and not x["accepted"])
        return [{"model": m, "agent": a, "n": n} for (m, a), n in c.most_common()]


def operational_metrics(tickets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """tickets: created, first_response, resolved (datetimes or None), reassignments, escalated, sla_first_response_min."""
    frt = [(t["first_response"] - t["created"]).total_seconds() / 60 for t in tickets if t.get("first_response")]
    ttr = [(t["resolved"] - t["created"]).total_seconds() / 3600 for t in tickets if t.get("resolved")]
    breach = [t for t in tickets if t.get("first_response") and (t["first_response"] - t["created"]).total_seconds() / 60 > t["sla_first_response_min"]]
    n = len(tickets) or 1
    return {"tickets": len(tickets), "first_response_min_median": round(statistics.median(frt), 1) if frt else None, "time_to_resolution_h_median": round(statistics.median(ttr), 1) if ttr else None, "sla_first_response_breach_rate": round(len(breach) / max(len(frt), 1), 3),
            "reassignments_per_ticket": round(sum(t.get("reassignments", 0) for t in tickets) / n, 3), "escalation_rate": round(sum(1 for t in tickets if t.get("escalated")) / n, 3)}
