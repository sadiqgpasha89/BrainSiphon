"""The triage API and the analyst console.

    uvicorn api.app:app --port 8000        (interactive docs at /docs, console at /ui/)

Roles (configs/users.yaml):  analyst -> cases, traces, final verdicts     approver -> containment approvals
                             agent-admin -> evaluate, promote and roll back agent versions
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api import service
from bsref import db, hitl, observability
from bsref.auth import Principal, require
from bsref.config import load_yaml, settings
from bsref.registry import Registry
from bsref.web import create_app, request_id
from data import schema  # noqa: F401 - registers this implementation's tables before the schema is created
from serving import agent
from training import train

CFG = load_yaml("configs/pipeline.yaml")
app = create_app("Agentic workflow: SOC alert triage", "1.0.0", ui_dir=Path(__file__).parent / "ui",
                 readiness=lambda: {"production_agent": agent.production_agent() is not None})
metrics = app.state.metrics
INVESTIGATIONS = metrics.counter("agent_investigations_total", "Investigations by verdict", ("verdict",))
STEPS = metrics.histogram("agent_steps", "Tool calls per investigation", buckets=(1, 2, 3, 4, 6, 8, 12))
APPROVALS = metrics.counter("agent_approval_decisions_total", "Approval decisions", ("decision",))
VERDICTS = metrics.counter("agent_analyst_verdicts_total", "Analyst final verdicts", ("agreement",))


class FinalVerdict(BaseModel):
    verdict: Literal["true_positive", "benign"]
    notes: str = Field(default="", max_length=2000)


class Decision(BaseModel):
    decision: Literal["approve", "reject"]
    notes: str = Field(default="", max_length=2000)


class Promotion(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@app.get("/v1/cases", tags=["cases"])
def cases(status: str | None = None, _: Principal = Depends(require("analyst"))) -> list[dict]:
    with db.tx() as conn:
        return service.list_cases(conn, status)


@app.get("/v1/cases/{case_id}", tags=["cases"])
def case(case_id: str, _: Principal = Depends(require("analyst"))) -> dict:
    """One case with the agent's verdict, its full tool trace and the proposed actions."""
    with db.tx() as conn:
        out = service.get_case(conn, case_id)
    if out is None:
        raise HTTPException(404, "no such case")
    return out


@app.post("/v1/cases/{case_id}/investigate", tags=["cases"])
def investigate(case_id: str, principal: Principal = Depends(require("analyst"))) -> dict:
    """Run the production agent on a new case now (the worker does this automatically). Idempotent."""
    with db.tx() as conn:
        if service.get_case(conn, case_id) is None:
            raise HTTPException(404, "no such case")
        out = agent.run_case(conn, case_id, started_by=principal.subject)
    if not out["replayed"]:
        INVESTIGATIONS.labels(out["verdict"]).inc()
        STEPS.observe(out["steps"])
    return out


@app.post("/v1/cases/{case_id}/verdict", tags=["feedback"])
def verdict(case_id: str, body: FinalVerdict, request: Request, principal: Principal = Depends(require("analyst"))) -> dict:
    with db.tx() as conn:
        out = service.set_verdict(conn, case_id, body.verdict, body.notes, principal.subject, request_id(request))
    if out is None:
        raise HTTPException(404, "no such case")
    VERDICTS.labels("agree" if out["agent_verdict"] == body.verdict else "override").inc()
    return out


@app.get("/v1/approvals", tags=["human approval"])
def approvals(status: str = "open", _: Principal = Depends(require("approver"))) -> list[dict]:
    service.expire()
    with db.tx() as conn:
        return hitl.list_tasks(conn, status=status or None, kind=agent.APPROVAL_KIND)


@app.post("/v1/approvals/{task_id}/decision", tags=["human approval"])
def approval_decision(task_id: int, body: Decision, request: Request, principal: Principal = Depends(require("approver"))) -> dict:
    """Approve or reject a proposed containment action. A critical asset needs two different approvers; the action is
    executed only when the last required approval arrives."""
    out = service.decide_approval(task_id, body.decision, body.notes, principal.subject, request_id(request))
    APPROVALS.labels(body.decision).inc()
    return out


@app.get("/v1/agent", tags=["agent versions"])
def agent_versions(_: Principal = Depends(require("analyst", "agent-admin"))) -> dict:
    reg, name = Registry(settings().registry_dir), CFG["model_name"]
    versions = [{k: v for k, v in m.items() if k != "extra"} | {"failures": m["extra"]["failures"], "incidents": m["extra"]["incidents"]}
                for m in reg.versions(name)]
    return {"production": reg.production_version(name), "versions": versions, "history": reg.history(name)}


@app.post("/v1/agent/evaluate", tags=["agent versions"])
def evaluate(principal: Principal = Depends(require("agent-admin"))) -> dict:
    """Evaluate the current configuration on the labelled suite, register it and promote it if every gate holds."""
    return train.run(by=principal.subject)


@app.post("/v1/agent/{version}/promote", tags=["agent versions"])
def promote(version: str, body: Promotion, request: Request, principal: Principal = Depends(require("agent-admin"))) -> dict:
    Registry(settings().registry_dir).promote(CFG["model_name"], version, principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "agent.promote", version, {"reason": body.reason}, request_id(request))
    return {"production": version}


@app.post("/v1/agent/rollback", tags=["agent versions"])
def rollback(body: Promotion, request: Request, principal: Principal = Depends(require("agent-admin"))) -> dict:
    version = Registry(settings().registry_dir).rollback(CFG["model_name"], principal.subject, body.reason)
    with db.tx() as conn:
        db.audit(conn, principal.subject, "agent.rollback", version, {"reason": body.reason}, request_id(request))
    return {"production": version}


@app.get("/v1/monitoring/summary", tags=["monitoring"])
def monitoring_summary(_: Principal = Depends(require("analyst"))) -> dict:
    with db.tx() as conn:
        prod = agent.production_agent()
        return {"agent_version": prod[1] if prod else "none", **service.summary(conn), "alerts_firing": observability.firing(conn)}
