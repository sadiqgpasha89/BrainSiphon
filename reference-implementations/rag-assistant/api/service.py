"""Business logic behind the API: asking, feedback, the documentation team's review queue, evaluation-set growth."""

from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import func, insert, select
from sqlalchemy.engine import Connection

from bsref import db, feedback, hitl
from bsref.auth import Principal
from data import schema
from serving.answer import Assistant

REVIEW_KIND = "answer-review"


def audience(principal: Principal) -> tuple[str, tuple[str, ...]]:
    """What a reader may see is decided from the token's roles, never from anything in the request body."""
    return ("internal", ("public", "internal")) if principal.has("employee") else ("public", ("public",))


def ask(conn: Connection, assistant: Assistant, question: str, principal: Principal) -> dict[str, Any]:
    aud, vis = audience(principal)
    a = assistant.ask(question, vis)
    answer_id = uuid.uuid4().hex
    conn.execute(insert(schema.answers).values(
        answer_id=answer_id, question=question, asked_by=principal.subject, audience=aud, status=a.status, answer=a.answer,
        citations=db.dumps(a.citations), retrieved=db.dumps(a.retrieved), index_version=a.index_version, provider=a.provider,
        top_score=a.top_score, unsupported_sentences=a.unsupported_sentences, latency_ms=a.latency_ms, created_at=db.now()))
    if a.status == "abstained":  # a question the docs could not answer is a signal for the people who write the docs
        _review(conn, assistant, answer_id, question, aud, a.answer, "abstained", "assistant")
    return {"answer_id": answer_id, **a.public()}


def _review(conn: Connection, assistant: Assistant, answer_id: str, question: str, aud: str, answer: str, reason: str, by: str) -> int:
    return hitl.create_task(conn, REVIEW_KIND, answer_id, {"question": question, "audience": aud, "answer": answer, "reason": reason},
                            requested_by=by, priority=70 if reason == "thumbs_down" else 40,
                            sla_seconds=assistant.cfg["review"]["sla_seconds"])


def rate(conn: Connection, assistant: Assistant, answer_id: str, rating: str, comment: str, actor: str) -> bool:
    row = conn.execute(select(schema.answers).where(schema.answers.c.answer_id == answer_id)).mappings().first()
    if not row:
        return False
    feedback.record(conn, "answer", answer_id, "user", rating, actor, {"comment": comment})
    if rating == "down":
        _review(conn, assistant, answer_id, row["question"], row["audience"], row["answer"], "thumbs_down", actor)
    return True


def resolve_review(conn: Connection, task_id: int, body: dict[str, Any], actor: str, request_id: str) -> dict[str, Any]:
    """A writer decides what the right behaviour was. Their decision becomes an evaluation example, so the next index build
    is measured against it: `answerable` names the document that answers it, `not_answerable` says declining was right
    (or that the docs have a gap, which the writer then fixes in the CMS), `dismiss` adds nothing."""
    task = hitl.decide(conn, task_id, actor, "reject" if body["resolution"] == "dismiss" else "approve", body.get("notes", ""))
    p = task["payload"]
    if body["resolution"] != "dismiss":
        expected = body.get("expected_doc_id") if body["resolution"] == "answerable" else None
        conn.execute(insert(schema.eval_examples).values(
            question=p["question"], expected_doc_id=expected, must_contain=body.get("must_contain", ""), audience=p["audience"],
            source="review", created_at=db.now()))
    feedback.record(conn, "answer", task["subject_id"], "writer", body["resolution"], actor, {"notes": body.get("notes", "")})
    db.audit(conn, actor, "answer.review", task["subject_id"], {"resolution": body["resolution"]}, request_id)
    return task


def summary(conn: Connection, window_seconds: float = 86400.0) -> dict[str, Any]:
    since = db.now() - window_seconds
    counts = dict(conn.execute(select(schema.answers.c.status, func.count()).where(schema.answers.c.created_at >= since)
                               .group_by(schema.answers.c.status)).all())
    ratings = dict(conn.execute(select(db.feedback.c.label, func.count()).where(
        db.feedback.c.subject_type == "answer", db.feedback.c.source == "user", db.feedback.c.created_at >= since)
        .group_by(db.feedback.c.label)).all())
    return {
        "answers_24h": {s: int(counts.get(s, 0)) for s in ("answered", "abstained", "refused")},
        "ratings_24h": {"up": int(ratings.get("up", 0)), "down": int(ratings.get("down", 0))},
        "open_reviews": int(conn.execute(select(func.count()).select_from(db.review_tasks).where(
            db.review_tasks.c.status.in_(("open", "claimed")))).scalar_one()),
        "documents": int(conn.execute(select(func.count()).select_from(schema.documents)).scalar_one()),
        "eval_examples": int(conn.execute(select(func.count()).select_from(schema.eval_examples)).scalar_one()),
        "quarantined": int(conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one()),
    }


def history(conn: Connection, answer_id: str) -> dict[str, Any] | None:
    row = conn.execute(select(schema.answers).where(schema.answers.c.answer_id == answer_id)).mappings().first()
    if not row:
        return None
    return {**dict(row), "citations": json.loads(row["citations"]), "retrieved": json.loads(row["retrieved"])}
