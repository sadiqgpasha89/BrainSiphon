"""The decision API and the analyst console.

    uvicorn api.app:app --port 8000        (interactive docs at /docs, console at /ui/)

Roles (configs/users.yaml):  scorer -> POST /v1/decisions, POST /v1/outcomes
                             analyst -> review queue, decisions, monitoring
                             ml-admin -> model promotion and rollback
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from api import service
from bsref import auth, db, hitl, observability
from bsref.auth import Principal, require
from bsref.config import settings
from bsref.registry import Registry
from bsref.web import create_app, request_id
from data import schema  # noqa: F401 - registers this implementation's tables before the schema is created
from serving.scorer import Scorer

scorer = Scorer()
app = create_app(
    "Real-time decisioning: payment fraud",
    "1.0.0",
    ui_dir=Path(__file__).parent / "ui",
    readiness=lambda: {"production_model": scorer.ready()},
)
metrics = app.state.metrics
DECISIONS = metrics.counter("fraud_decisions_total", "Decisions by action", ("action", "fallback"))
SCORE = metrics.histogram("fraud_score", "Calibrated fraud score", buckets=(0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0))
SCORING_MS = metrics.histogram(
    "fraud_scoring_duration_ms", "Feature fetch + model time", buckets=(1, 2, 5, 10, 20, 50, 100, 250)
)
REVIEWS = metrics.counter("fraud_reviews_total", "Analyst verdicts", ("verdict",))
MODEL_INFO = metrics.gauge("fraud_model_info", "1 for the model version currently serving", ("version",))


class Transaction(BaseModel):
    """Mirrors data/contracts/transaction.yaml: the request is rejected (422) before any work is done if it does not conform."""

    model_config = ConfigDict(extra="forbid")
    txn_id: str = Field(pattern=r"^[A-Za-z0-9_-]{6,64}$")
    card_id: int = Field(ge=1)
    merchant_id: int = Field(ge=1)
    device_id: int = Field(ge=1)
    amount: float = Field(ge=0.01, le=1_000_000)
    rail: Literal["card", "upi"]
    country: str = Field(pattern=r"^[A-Z]{2}$")
    event_time: float = Field(ge=1_000_000_000)


class DecisionOut(BaseModel):
    txn_id: str
    action: Literal["ALLOW", "STEP_UP", "BLOCK"]
    score: float
    reason: str
    model_version: str
    fallback: bool
    latency_ms: float


class Verdict(BaseModel):
    verdict: Literal["fraud", "genuine"]
    notes: str = Field(default="", max_length=2000)


class Outcome(BaseModel):
    txn_id: str
    outcome: Literal["step_up_passed", "step_up_failed"]


class Promotion(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@app.post("/v1/decisions", response_model=DecisionOut, tags=["decisions"])
def decide(
    txn: Transaction,
    idempotency_key: str | None = Header(default=None, max_length=128),
    principal: Principal = Depends(require("scorer")),
) -> dict:
    """Decide one authorisation request. Safe to retry: the same Idempotency-Key (default: txn_id) returns the same decision."""
    with db.tx() as conn:
        out, replayed = service.decide(conn, scorer, txn.model_dump(), idempotency_key or txn.txn_id, principal.subject)
    if not replayed:
        DECISIONS.labels(out["action"], str(out["fallback"]).lower()).inc()
        SCORE.observe(out["score"])
        SCORING_MS.observe(out["latency_ms"])
        MODEL_INFO.labels(out["model_version"]).set(1)
    return out


@app.get("/v1/decisions/{txn_id}", tags=["decisions"])
def get_decision(txn_id: str, _: Principal = Depends(require("analyst", "scorer"))) -> dict:
    with db.tx() as conn:
        found = service.get_decision(conn, txn_id)
    if not found:
        raise HTTPException(404, "no decision for this transaction")
    return found


@app.post("/v1/outcomes", status_code=202, tags=["feedback"])
def outcome(body: Outcome, principal: Principal = Depends(require("scorer"))) -> dict:
    """The gateway reports how a STEP_UP ended. A passed challenge is a genuine label; a failed one is a fraud label."""
    with db.tx() as conn:
        if not service.get_decision(conn, body.txn_id):
            raise HTTPException(404, "no decision for this transaction")
        service.record_label(conn, body.txn_id, body.outcome == "step_up_failed", "step-up", principal.subject)
    return {"accepted": True}


@app.get("/v1/reviews", tags=["human review"])
def reviews(status: str = "open", _: Principal = Depends(require("analyst"))) -> list[dict]:
    with db.tx() as conn:
        hitl.expire_overdue(conn)
        return hitl.list_tasks(conn, status=status or None, kind=service.REVIEW_KIND)


@app.post("/v1/reviews/{task_id}/claim", tags=["human review"])
def claim(task_id: int, principal: Principal = Depends(require("analyst"))) -> dict:
    with db.tx() as conn:
        return hitl.claim(conn, task_id, principal.subject)


@app.post("/v1/reviews/{task_id}/decision", tags=["human review"])
def review_decision(task_id: int, body: Verdict, request: Request, principal: Principal = Depends(require("analyst"))) -> dict:
    with db.tx() as conn:
        task = service.resolve_review(conn, task_id, body.verdict, principal.subject, body.notes, request_id(request))
    REVIEWS.labels(body.verdict).inc()
    return task


@app.get("/v1/models", tags=["models"])
def models(_: Principal = Depends(require("analyst", "ml-admin"))) -> dict:
    scorer.refresh()
    reg, name = Registry(settings().registry_dir), scorer.cfg["model_name"]
    versions = [{k: v for k, v in m.items() if k != "extra"} | {"thresholds": m["extra"].get("thresholds")} for m in reg.versions(name)]
    return {"serving": scorer.version, "production": reg.production_version(name), "versions": versions, "history": reg.history(name)}


@app.post("/v1/models/{version}/promote", tags=["models"])
def promote(version: str, body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    Registry(settings().registry_dir).promote(scorer.cfg["model_name"], version, principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "model.promote", version, {"reason": body.reason}, request_id(request))
    scorer.refresh(force=True)
    return {"production": version, "serving": scorer.version}


@app.post("/v1/models/rollback", tags=["models"])
def rollback(body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    version = Registry(settings().registry_dir).rollback(scorer.cfg["model_name"], principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "model.rollback", version, {"reason": body.reason}, request_id(request))
    scorer.refresh(force=True)
    return {"production": version, "serving": scorer.version}


@app.get("/v1/monitoring/summary", tags=["monitoring"])
def monitoring_summary(_: Principal = Depends(require("analyst", "ml-admin"))) -> dict:
    scorer.refresh()  # report the version that will serve the next request, even before the first decision
    with db.tx() as conn:
        return {**service.summary(conn, scorer), "alerts_firing": observability.firing(conn)}


_ = auth  # re-exported for tests
