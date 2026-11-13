"""The monitoring job: what the agent decided, how often people disagreed, whether its tools and its approvals are healthy.

    python -m monitoring.job

The strongest quality signal for an agent is the people around it: `override_rate` is how often an analyst's final verdict
differs from a verdict the agent reached by itself, and `live_missed_threats` counts cases it closed as benign that an
analyst later called a true positive.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select

from bsref import bus, db, observability
from data import ingest, schema

C, S = schema.cases, schema.agent_steps


def collect() -> dict[str, float]:
    out: dict[str, float] = {}
    with db.tx() as conn:
        out["consumer_lag"] = float(bus.lag(conn, ingest.TOPIC, ingest.GROUP))
        out["dead_letters"] = float(conn.execute(select(func.count()).select_from(db.dead_letters)).scalar_one())
        out["quarantined"] = float(conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one())
        rows = conn.execute(select(C.c.status, C.c.agent_verdict, C.c.final_verdict, C.c.steps, C.c.injection_suspected,
                                   C.c.agent_summary)).all()
        investigated = [r for r in rows if r[1] is not None]
        out["cases"] = float(len(rows))
        out["uninvestigated_cases"] = float(sum(r[0] == "new" for r in rows))
        out["injection_suspected_cases"] = float(sum(r[4] for r in rows))
        if investigated:
            out["escalation_rate"] = sum(r[1] == "needs_human" for r in investigated) / len(investigated)
            out["auto_closed_rate"] = sum(r[1] == "benign" for r in investigated) / len(investigated)
            out["mean_steps"] = sum(r[3] for r in investigated) / len(investigated)
            out["budget_exhausted_cases"] = float(sum("step budget" in (r[5] or "") for r in investigated))
        decided = [r for r in rows if r[2] is not None and r[1] in ("true_positive", "benign")]
        if len(decided) >= 3:  # the agent's own verdicts that an analyst has since confirmed or changed
            out["override_rate"] = sum(r[1] != r[2] for r in decided) / len(decided)
        out["live_missed_threats"] = float(sum(r[1] == "benign" and r[2] == "true_positive" for r in rows))
        steps = conn.execute(select(func.count(), func.sum(S.c.ok))).one()
        if steps[0]:
            out["tool_error_rate"] = 1 - (steps[1] or 0) / steps[0]
        tasks = dict(conn.execute(select(db.review_tasks.c.status, func.count()).group_by(db.review_tasks.c.status)).all())
        closed = tasks.get("approved", 0) + tasks.get("rejected", 0)
        if closed >= 3:
            out["approval_rejection_rate"] = tasks.get("rejected", 0) / closed
        out["approvals_overdue"] = float(conn.execute(select(func.count()).select_from(db.review_tasks).where(
            db.review_tasks.c.status.in_(("open", "claimed")), db.review_tasks.c.due_at < db.now())).scalar_one())
        out["labelled_incidents"] = float(conn.execute(select(func.count()).select_from(schema.labelled_incidents)).scalar_one())
    return out


def run() -> dict[str, Any]:
    db.init_schema()
    values = collect()
    with db.tx() as conn:
        changed = observability.evaluate_alerts(conn, values)
        firing = [a["rule"] for a in observability.firing(conn)]
    return {"metrics": {k: round(v, 5) for k, v in values.items()}, "alerts_changed": changed, "alerts_firing": firing}


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
