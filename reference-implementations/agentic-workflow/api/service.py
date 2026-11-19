"""Business logic behind the API: case views, analyst verdicts, approvals."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, insert, select, update
from sqlalchemy.engine import Connection

from bsref import db, feedback, hitl
from data import schema
from serving import actions

C = schema.cases


def get_case(conn: Connection, case_id: str) -> dict[str, Any] | None:
    row = conn.execute(select(C).where(C.c.case_id == case_id)).mappings().first()
    if not row:
        return None
    steps = conn.execute(select(schema.agent_steps).where(schema.agent_steps.c.case_id == case_id).order_by(schema.agent_steps.c.step)
                         ).mappings().all()
    acts = conn.execute(select(schema.proposed_actions).where(schema.proposed_actions.c.case_id == case_id)).mappings().all()
    return {**dict(row), "trace": [{"step": s["step"], "tool": s["tool"], "arguments": json.loads(s["arguments"]),
                                    "result": json.loads(s["result"]), "ok": bool(s["ok"]), "ms": s["ms"]} for s in steps],
            "actions": [dict(a) for a in acts]}


def list_cases(conn: Connection, status: str | None) -> list[dict[str, Any]]:
    q = select(C).order_by(C.c.created_at.desc()).limit(200)
    if status:
        q = q.where(C.c.status == status)
    return [dict(r) for r in conn.execute(q).mappings()]


def set_verdict(conn: Connection, case_id: str, verdict: str, notes: str, actor: str, request_id: str) -> dict[str, Any] | None:
    """The analyst's final verdict. It closes a case that was left to a person, records agreement or disagreement with the
    agent as feedback, and adds the case to the labelled suite the next agent version is evaluated on."""
    case = get_case(conn, case_id)
    if not case:
        return None
    values: dict[str, Any] = {"final_verdict": verdict, "decided_by": actor}
    if case["status"] in ("needs_human", "new"):
        values.update(status="closed", closed_at=db.now())
    conn.execute(update(C).where(C.c.case_id == case_id).values(**values))
    agreed = case["agent_verdict"] == verdict
    feedback.record(conn, "case", case_id, "analyst", "agree" if agreed else "override", actor,
                    {"agent_verdict": case["agent_verdict"], "final_verdict": verdict, "notes": notes})
    executed = [[a["action"], a["target"]] for a in case["actions"] if a["status"] == "executed"]
    if not conn.execute(select(schema.labelled_incidents.c.case_id).where(schema.labelled_incidents.c.case_id == case_id)).first():
        conn.execute(insert(schema.labelled_incidents).values(
            case_id=case_id, verdict=verdict, expected_actions=db.dumps(executed if verdict == "true_positive" else []),
            has_injection=case["injection_suspected"], source="analyst", created_at=db.now()))
    db.audit(conn, actor, "case.verdict", case_id, {"verdict": verdict, "agent_verdict": case["agent_verdict"]}, request_id)
    return get_case(conn, case_id)


def decide_approval(task_id: int, decision: str, notes: str, actor: str, request_id: str) -> dict[str, Any]:
    with db.tx() as conn:  # the decision is committed first; only then may anything be executed
        task = hitl.decide(conn, task_id, actor, decision, notes)
        db.audit(conn, actor, f"approval.{decision}", task["subject_id"], {"notes": notes, "status": task["status"]}, request_id)
    return {"task": task, "action": actions.settle(task, actor, request_id)}


def expire() -> int:
    """Approvals nobody gave in time are closed; the safe default is that nothing is executed and a person owns the case."""
    with db.tx() as conn:
        overdue = conn.execute(select(db.review_tasks.c.id).where(db.review_tasks.c.status.in_(("open", "claimed")),
                                                                  db.review_tasks.c.due_at < db.now())).scalars().all()
        hitl.expire_overdue(conn)
        tasks = [hitl.get_task(conn, i) for i in overdue]
    for t in tasks:
        actions.settle(t, "system")
    return len(tasks)


def summary(conn: Connection) -> dict[str, Any]:
    counts = dict(conn.execute(select(C.c.status, func.count()).group_by(C.c.status)).all())
    fb = dict(conn.execute(select(db.feedback.c.label, func.count()).where(db.feedback.c.subject_type == "case")
                           .group_by(db.feedback.c.label)).all())
    return {"cases": {k: int(v) for k, v in counts.items()},
            "analyst_feedback": {"agree": int(fb.get("agree", 0)), "override": int(fb.get("override", 0))},
            "pending_approvals": int(conn.execute(select(func.count()).select_from(db.review_tasks).where(
                db.review_tasks.c.status.in_(("open", "claimed")))).scalar_one()),
            "labelled_incidents": int(conn.execute(select(func.count()).select_from(schema.labelled_incidents)).scalar_one()),
            "quarantined": int(conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one())}
