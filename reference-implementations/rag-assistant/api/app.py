"""The assistant API and its two consuming applications in one page: the ask box and the documentation team's queue.

    uvicorn api.app:app --port 8000        (interactive docs at /docs, application at /ui/)

Roles (configs/users.yaml):  user -> ask, rate           employee -> answers may also use internal documents
                             writer -> review queue      ml-admin -> rebuild, promote and roll back the index
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from api import service
from bsref import db, hitl, observability
from bsref.auth import Principal, require
from bsref.config import settings
from bsref.registry import Registry
from bsref.web import create_app, request_id
from data import schema  # noqa: F401 - registers this implementation's tables before the schema is created
from serving.answer import Assistant
from training import train

assistant = Assistant()
app = create_app("RAG assistant: developer documentation", "1.0.0", ui_dir=Path(__file__).parent / "ui",
                 readiness=lambda: {"production_index": assistant.ready()})
metrics = app.state.metrics
ANSWERS = metrics.counter("rag_answers_total", "Answers by status", ("status", "audience"))
UNSUPPORTED = metrics.counter("rag_unsupported_sentences_total", "Generated sentences removed by citation verification")
COVERAGE = metrics.histogram("rag_top_coverage", "Best retrieval coverage per question", buckets=(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0))
ANSWER_MS = metrics.histogram("rag_answer_duration_ms", "Retrieve + generate + verify", buckets=(5, 10, 25, 50, 100, 250, 1000, 5000, 30000))
RATINGS = metrics.counter("rag_ratings_total", "User ratings", ("rating",))
INDEX_INFO = metrics.gauge("rag_index_info", "1 for the index version currently serving", ("version",))


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")  # in particular: no client-supplied audience or visibility
    question: str = Field(min_length=3, max_length=1000)


class Rating(BaseModel):
    rating: Literal["up", "down"]
    comment: str = Field(default="", max_length=2000)


class Resolution(BaseModel):
    resolution: Literal["answerable", "not_answerable", "dismiss"]
    expected_doc_id: str | None = Field(default=None, max_length=80)
    must_contain: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=2000)


class Promotion(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@app.post("/v1/ask", tags=["assistant"])
def ask(body: Question, principal: Principal = Depends(require("user"))) -> dict:
    """Answer from the documentation the caller is allowed to see, with a citation for every sentence, or decline."""
    with db.tx() as conn:
        out = service.ask(conn, assistant, body.question, principal)
        row = service.history(conn, out["answer_id"])
    ANSWERS.labels(out["status"], row["audience"]).inc()
    UNSUPPORTED.inc(row["unsupported_sentences"])
    COVERAGE.observe(row["top_score"])
    ANSWER_MS.observe(out["latency_ms"])
    INDEX_INFO.labels(out["index_version"]).set(1)
    return out


@app.post("/v1/answers/{answer_id}/feedback", status_code=202, tags=["feedback"])
def rate(answer_id: str, body: Rating, principal: Principal = Depends(require("user"))) -> dict:
    """Thumbs up or down. A thumbs-down sends the answer to the documentation team's review queue."""
    with db.tx() as conn:
        if not service.rate(conn, assistant, answer_id, body.rating, body.comment, principal.subject):
            raise HTTPException(404, "no such answer")
    RATINGS.labels(body.rating).inc()
    return {"accepted": True}


@app.get("/v1/reviews", tags=["human review"])
def reviews(status: str = "open", _: Principal = Depends(require("writer"))) -> list[dict]:
    with db.tx() as conn:
        hitl.expire_overdue(conn)
        return hitl.list_tasks(conn, status=status or None, kind=service.REVIEW_KIND)


@app.post("/v1/reviews/{task_id}/claim", tags=["human review"])
def claim(task_id: int, principal: Principal = Depends(require("writer"))) -> dict:
    with db.tx() as conn:
        return hitl.claim(conn, task_id, principal.subject)


@app.post("/v1/reviews/{task_id}/decision", tags=["human review"])
def review_decision(task_id: int, body: Resolution, request: Request, principal: Principal = Depends(require("writer"))) -> dict:
    if body.resolution == "answerable" and not body.expected_doc_id:
        raise HTTPException(422, "expected_doc_id is required when the resolution is 'answerable'")
    with db.tx() as conn:
        return service.resolve_review(conn, task_id, body.model_dump(), principal.subject, request_id(request))


@app.get("/v1/index", tags=["index"])
def index_versions(_: Principal = Depends(require("writer", "ml-admin"))) -> dict:
    assistant.refresh()
    reg, name = Registry(settings().registry_dir), assistant.cfg["model_name"]
    versions = [{k: v for k, v in m.items() if k != "extra"} | {"chunks": m["extra"]["chunks"], "failures": m["extra"]["failures"]}
                for m in reg.versions(name)]
    return {"serving": assistant.version, "production": reg.production_version(name), "versions": versions, "history": reg.history(name)}


@app.post("/v1/index/rebuild", tags=["index"])
def rebuild(principal: Principal = Depends(require("ml-admin"))) -> dict:
    """Build a new index from the current documents, evaluate it, and promote it if every gate holds."""
    out = train.run(by=principal.subject)
    assistant.refresh(force=True)
    return out


@app.post("/v1/index/{version}/promote", tags=["index"])
def promote(version: str, body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    Registry(settings().registry_dir).promote(assistant.cfg["model_name"], version, principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "index.promote", version, {"reason": body.reason}, request_id(request))
    assistant.refresh(force=True)
    return {"production": version, "serving": assistant.version}


@app.post("/v1/index/rollback", tags=["index"])
def rollback(body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    version = Registry(settings().registry_dir).rollback(assistant.cfg["model_name"], principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "index.rollback", version, {"reason": body.reason}, request_id(request))
    assistant.refresh(force=True)
    return {"production": version, "serving": assistant.version}


@app.get("/v1/monitoring/summary", tags=["monitoring"])
def monitoring_summary(_: Principal = Depends(require("writer", "ml-admin"))) -> dict:
    assistant.refresh()  # report the index that will serve the next question, even before the first one
    with db.tx() as conn:
        return {"index_version": assistant.version, **service.summary(conn), "alerts_firing": observability.firing(conn)}
