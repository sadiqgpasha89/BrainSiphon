"""Business logic behind the API, kept free of HTTP so that it can be tested and reused."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, insert, select
from sqlalchemy.engine import Connection

from bsref import db, feedback, hitl
from data import schema
from serving.scorer import Decision, Scorer

REVIEW_KIND = "fraud-block"


def decide(conn: Connection, scorer: Scorer, txn: dict[str, Any], key: str, actor: str) -> tuple[dict[str, Any], bool]:
    """Score once per idempotency key. A retry of the same request returns the stored decision (replayed=True)."""
    prior = conn.execute(select(schema.decisions).where(schema.decisions.c.idempotency_key == key)).mappings().first()
    if prior:
        return _public(dict(prior)), True
    d: Decision = scorer.decide(conn, txn)
    row = {
        "idempotency_key": key, "txn_id": txn["txn_id"], "action": d.action, "score": d.score, "reason": d.reason,
        "model_version": d.model_version, "fallback": int(d.fallback), "features": db.dumps(d.features),
        "latency_ms": d.latency_ms, "created_at": db.now(),
    }
    conn.execute(insert(schema.decisions).values(**row))
    if d.action == "BLOCK":  # a declined customer is the expensive mistake: every block is reviewed by a person
        hitl.create_task(
            conn, REVIEW_KIND, txn["txn_id"],
            {"txn": txn, "score": d.score, "reason": d.reason, "model_version": d.model_version},
            requested_by="fraud-scorer", priority=min(99, int(d.score * 100)),
            sla_seconds=scorer.cfg["serving"]["review_sla_seconds"],
        )
    return _public(row), False


def _public(row: dict[str, Any]) -> dict[str, Any]:
    out = {k: row[k] for k in ("txn_id", "action", "score", "reason", "model_version", "latency_ms")}
    out["fallback"] = bool(row["fallback"])
    return out


def get_decision(conn: Connection, txn_id: str) -> dict[str, Any] | None:
    row = conn.execute(select(schema.decisions).where(schema.decisions.c.txn_id == txn_id)).mappings().first()
    if not row:
        return None
    return {**_public(dict(row)), "features": json.loads(row["features"]), "created_at": row["created_at"]}


def record_label(conn: Connection, txn_id: str, is_fraud: bool, source: str, actor: str, notes: str = "") -> None:
    """A human or customer outcome becomes a training label and a feedback record. A chargeback is never overwritten."""
    existing = conn.execute(select(schema.labels.c.source).where(schema.labels.c.txn_id == txn_id)).scalar()
    if existing != "chargeback":
        db.upsert(conn, schema.labels, {"txn_id": txn_id}, {"is_fraud": int(is_fraud), "source": source, "label_time": db.now()})
    feedback.record(conn, "transaction", txn_id, source, "fraud" if is_fraud else "genuine", actor, {"notes": notes})


def resolve_review(conn: Connection, task_id: int, verdict: str, actor: str, notes: str, request_id: str) -> dict[str, Any]:
    """`fraud` confirms the block; `genuine` overturns it (the payment is released and the customer is not flagged)."""
    task = hitl.decide(conn, task_id, actor, "approve" if verdict == "fraud" else "reject", notes)
    record_label(conn, task["subject_id"], verdict == "fraud", "analyst", actor, notes)
    db.audit(conn, actor, "review.decide", f"review/{task_id}", {"verdict": verdict, "txn_id": task["subject_id"]}, request_id)
    return task


def summary(conn: Connection, scorer: Scorer, window_seconds: float = 86400.0) -> dict[str, Any]:
    since = db.now() - window_seconds
    rows = conn.execute(
        select(schema.decisions.c.action, func.count()).where(schema.decisions.c.created_at >= since)
        .group_by(schema.decisions.c.action)
    ).all()
    counts = {a: int(n) for a, n in rows}
    open_reviews = conn.execute(
        select(func.count()).select_from(db.review_tasks).where(db.review_tasks.c.status.in_(("open", "claimed")))
    ).scalar_one()
    return {
        "model_version": scorer.version,
        "decisions_24h": {"ALLOW": counts.get("ALLOW", 0), "STEP_UP": counts.get("STEP_UP", 0), "BLOCK": counts.get("BLOCK", 0)},
        "open_reviews": int(open_reviews),
        "quarantined_events": int(conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one()),
        "dead_letters": int(conn.execute(select(func.count()).select_from(db.dead_letters)).scalar_one()),
    }
