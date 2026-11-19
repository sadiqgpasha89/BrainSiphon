"""The forecast API and the planner console.

    uvicorn api.app:app --port 8000        (interactive docs at /docs, console at /ui/)

Roles (configs/users.yaml):  consumer -> read forecasts      planner -> runs, reviews, overrides, accuracy
                             ml-admin -> model promotion and rollback
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from api import service
from bsref import db, hitl, observability
from bsref.auth import Principal, require
from bsref.config import load_yaml, settings
from bsref.registry import Registry
from bsref.web import create_app, request_id
from data import schema
from serving import batch

CFG = load_yaml("configs/pipeline.yaml")


def _registry() -> Registry:
    return Registry(settings().registry_dir)


app = create_app(
    "Batch forecasting: demand sensing", "1.0.0", ui_dir=Path(__file__).parent / "ui",
    readiness=lambda: {"production_model": _registry().production_version(CFG["model_name"]) is not None},
)
metrics = app.state.metrics
SERVED = metrics.counter("forecast_requests_total", "Forecast reads by status", ("status",))
RUNS = metrics.counter("forecast_runs_total", "Forecast runs started through the API", ("outcome",))
VERDICTS = metrics.counter("forecast_planner_verdicts_total", "Planner decisions", ("verdict",))


class Verdict(BaseModel):
    verdict: Literal["accept_model", "keep_baseline", "override"]
    factor: float = Field(default=1.0, ge=0.0, le=10.0, description="Multiplier applied to the model's p50 when verdict is override")
    notes: str = Field(default="", max_length=2000)


class Override(BaseModel):
    store_id: str = Field(pattern=r"^S[0-9]{3}$")
    sku: str = Field(pattern=r"^K[0-9]{4}$")
    factor: float = Field(ge=0.0, le=10.0)
    reason: str = Field(min_length=5, max_length=2000)


class Promotion(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@app.get("/v1/forecasts", tags=["forecasts"])
def forecasts(store_id: str, sku: str, run_id: str | None = None, _: Principal = Depends(require("consumer"))) -> dict:
    """The 14-day forecast for one product in one store, from the latest run unless `run_id` is given. `final` is the number
    to act on: the model's p50, a planner's override, or the seasonal-naive baseline while the series is held for review."""
    with db.tx() as conn:
        out = service.get_forecasts(conn, store_id, sku, run_id)
    if out is None:
        raise HTTPException(404, "no forecast for this series")
    SERVED.labels(out["status"]).inc()
    return out


@app.post("/v1/forecasts/override", tags=["human review"])
def override(body: Override, request: Request, principal: Principal = Depends(require("planner"))) -> dict:
    with db.tx() as conn:
        out = service.override(conn, body.store_id, body.sku, body.factor, principal.subject, body.reason, request_id(request))
    if out is None:
        raise HTTPException(404, "no forecast for this series in the latest run")
    VERDICTS.labels("override").inc()
    return out


@app.post("/v1/runs", tags=["runs"])
def start_run(principal: Principal = Depends(require("planner"))) -> dict:
    """Start a forecast run now. Idempotent: for the same origin day and model it returns the existing run."""
    try:
        out = batch.run(started_by=principal.subject)
    except Exception:
        RUNS.labels("failed").inc()
        raise
    RUNS.labels("replayed" if out["replayed"] else "created").inc()
    return out


@app.get("/v1/runs", tags=["runs"])
def runs(_: Principal = Depends(require("planner", "consumer"))) -> list[dict]:
    with db.tx() as conn:
        rows = conn.execute(select(schema.forecast_runs).order_by(schema.forecast_runs.c.created_at.desc()).limit(50)).mappings().all()
    return [dict(r) for r in rows]


@app.get("/v1/accuracy", tags=["feedback"])
def accuracy(run_id: str | None = None, _: Principal = Depends(require("planner"))) -> dict:
    """Published forecasts against the actuals that have arrived since, including whether overrides helped."""
    with db.tx() as conn:
        return service.accuracy(conn, run_id)


@app.get("/v1/reviews", tags=["human review"])
def reviews(status: str = "open", _: Principal = Depends(require("planner"))) -> list[dict]:
    with db.tx() as conn:
        hitl.expire_overdue(conn)
        return hitl.list_tasks(conn, status=status or None, kind=batch.REVIEW_KIND)


@app.post("/v1/reviews/{task_id}/claim", tags=["human review"])
def claim(task_id: int, principal: Principal = Depends(require("planner"))) -> dict:
    with db.tx() as conn:
        return hitl.claim(conn, task_id, principal.subject)


@app.post("/v1/reviews/{task_id}/decision", tags=["human review"])
def review_decision(task_id: int, body: Verdict, request: Request, principal: Principal = Depends(require("planner"))) -> dict:
    with db.tx() as conn:
        task = service.resolve_review(conn, task_id, body.verdict, body.factor, principal.subject, body.notes, request_id(request))
    VERDICTS.labels(body.verdict).inc()
    return task


@app.get("/v1/models", tags=["models"])
def models(_: Principal = Depends(require("planner", "ml-admin"))) -> dict:
    reg, name = _registry(), CFG["model_name"]
    versions = [{k: v for k, v in m.items() if k != "extra"} | {"origins": m["extra"].get("origins")} for m in reg.versions(name)]
    return {"production": reg.production_version(name), "versions": versions, "history": reg.history(name)}


@app.post("/v1/models/{version}/promote", tags=["models"])
def promote(version: str, body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    _registry().promote(CFG["model_name"], version, principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "model.promote", version, {"reason": body.reason}, request_id(request))
    return {"production": version}


@app.post("/v1/models/rollback", tags=["models"])
def rollback(body: Promotion, request: Request, principal: Principal = Depends(require("ml-admin"))) -> dict:
    version = _registry().rollback(CFG["model_name"], principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "model.rollback", version, {"reason": body.reason}, request_id(request))
    return {"production": version}


@app.get("/v1/monitoring/summary", tags=["monitoring"])
def monitoring_summary(_: Principal = Depends(require("planner", "ml-admin"))) -> dict:
    with db.tx() as conn:
        return {"latest_run": service.latest_run(conn), "accuracy": service.accuracy(conn),
                "production_model": _registry().production_version(CFG["model_name"]), "alerts_firing": observability.firing(conn)}
