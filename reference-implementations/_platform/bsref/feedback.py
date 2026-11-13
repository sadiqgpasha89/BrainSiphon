"""Feedback capture: every outcome that can become a training label or an evaluation example lands in one table."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, insert, select
from sqlalchemy.engine import Connection

from . import db


def record(
    conn: Connection, subject_type: str, subject_id: str, source: str, label: str, actor: str, detail: dict[str, Any] | None = None
) -> int:
    res = conn.execute(
        insert(db.feedback).values(
            subject_type=subject_type,
            subject_id=str(subject_id),
            source=source,
            label=label,
            detail=db.dumps(detail or {}),
            actor=actor,
            created_at=db.now(),
        )
    )
    return int(res.inserted_primary_key[0])


def count_since(conn: Connection, subject_type: str, since: float) -> int:
    return int(
        conn.execute(
            select(func.count()).select_from(db.feedback).where(
                db.feedback.c.subject_type == subject_type, db.feedback.c.created_at > since
            )
        ).scalar_one()
    )


def fetch(conn: Connection, subject_type: str, since: float = 0.0) -> list[dict[str, Any]]:
    rows = conn.execute(
        select(db.feedback)
        .where(db.feedback.c.subject_type == subject_type, db.feedback.c.created_at > since)
        .order_by(db.feedback.c.id)
    ).mappings().all()
    return [{**dict(r), "detail": json.loads(r["detail"])} for r in rows]
