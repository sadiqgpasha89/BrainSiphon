"""Human-in-the-loop review queue.

A task is created when the system must not act alone (a blocked payment, a low-confidence extraction, an agent that wants to
run a destructive action). State machine:  open -> claimed -> approved | rejected,  and open/claimed -> expired after the SLA.

`required_approvals` > 1 gives a four-eyes control: approvals must come from distinct people, and the requester can never
approve their own request. Every transition is written to the audit log by the caller's transaction.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import insert, select, update
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from . import db


class ReviewError(Exception):
    def __init__(self, message: str, code: int = 409):
        super().__init__(message)
        self.code = code


def create_task(
    conn: Connection,
    kind: str,
    subject_id: str,
    payload: dict[str, Any],
    requested_by: str = "system",
    priority: int = 50,
    sla_seconds: int = 3600,
    required_approvals: int = 1,
) -> int:
    """Idempotent on (kind, subject_id): asking twice for the same review returns the existing task."""
    existing = conn.execute(
        select(db.review_tasks.c.id).where(db.review_tasks.c.kind == kind, db.review_tasks.c.subject_id == str(subject_id))
    ).first()
    if existing:
        return int(existing[0])
    t = db.now()
    try:
        with conn.begin_nested():
            res = conn.execute(
                insert(db.review_tasks).values(
                    kind=kind,
                    subject_id=str(subject_id),
                    payload=db.dumps(payload),
                    priority=priority,
                    status="open",
                    requested_by=requested_by,
                    required_approvals=required_approvals,
                    decisions="[]",
                    created_at=t,
                    due_at=t + sla_seconds,
                )
            )
            return int(res.inserted_primary_key[0])
    except IntegrityError:
        return create_task(conn, kind, subject_id, payload, requested_by, priority, sla_seconds, required_approvals)


def _row(r: Any) -> dict[str, Any]:
    d = dict(r)
    d["payload"] = json.loads(d["payload"])
    d["decisions"] = json.loads(d["decisions"])
    return d


def get_task(conn: Connection, task_id: int) -> dict[str, Any]:
    r = conn.execute(select(db.review_tasks).where(db.review_tasks.c.id == task_id)).mappings().first()
    if r is None:
        raise ReviewError(f"review task {task_id} not found", 404)
    return _row(r)


def list_tasks(conn: Connection, status: str | None = "open", kind: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    q = select(db.review_tasks)
    if status:
        q = q.where(db.review_tasks.c.status == status)
    if kind:
        q = q.where(db.review_tasks.c.kind == kind)
    q = q.order_by(db.review_tasks.c.priority.desc(), db.review_tasks.c.created_at).limit(limit)
    return [_row(r) for r in conn.execute(q).mappings().all()]


def claim(conn: Connection, task_id: int, user: str) -> dict[str, Any]:
    res = conn.execute(
        update(db.review_tasks)
        .where(db.review_tasks.c.id == task_id, db.review_tasks.c.status == "open")
        .values(status="claimed", assignee=user)
    )
    if res.rowcount != 1:  # compare-and-set: two reviewers cannot both claim it
        task = get_task(conn, task_id)
        if task["status"] == "claimed" and task["assignee"] == user:
            return task
        raise ReviewError(f"task {task_id} is {task['status']}" + (f" by {task['assignee']}" if task["assignee"] else ""))
    return get_task(conn, task_id)


def decide(conn: Connection, task_id: int, user: str, decision: str, notes: str = "") -> dict[str, Any]:
    """Record an approve / reject. Returns the task; its status is final once enough distinct approvals are in."""
    if decision not in ("approve", "reject"):
        raise ReviewError("decision must be 'approve' or 'reject'", 422)
    task = get_task(conn, task_id)
    if task["status"] not in ("open", "claimed"):
        raise ReviewError(f"task {task_id} is already {task['status']}")
    if db.now() > task["due_at"]:
        conn.execute(update(db.review_tasks).where(db.review_tasks.c.id == task_id).values(status="expired", closed_at=db.now()))
        raise ReviewError(f"task {task_id} expired: the safe default applies")
    if user == task["requested_by"]:
        raise ReviewError("the requester cannot decide their own request", 403)
    if any(d["by"] == user for d in task["decisions"]):
        raise ReviewError(f"{user} has already decided this task")
    decisions = task["decisions"] + [{"by": user, "decision": decision, "notes": notes, "at": db.now()}]
    approvals = sum(d["decision"] == "approve" for d in decisions)
    values: dict[str, Any] = {"decisions": db.dumps(decisions)}
    if decision == "reject":
        values.update(status="rejected", closed_at=db.now())
    elif approvals >= task["required_approvals"]:
        values.update(status="approved", closed_at=db.now())
    conn.execute(update(db.review_tasks).where(db.review_tasks.c.id == task_id).values(**values))
    return get_task(conn, task_id)


def expire_overdue(conn: Connection) -> int:
    """Run on a schedule: a review nobody made in time is closed as expired, and the caller applies its safe default."""
    res = conn.execute(
        update(db.review_tasks)
        .where(db.review_tasks.c.status.in_(("open", "claimed")), db.review_tasks.c.due_at < db.now())
        .values(status="expired", closed_at=db.now())
    )
    return int(res.rowcount)
