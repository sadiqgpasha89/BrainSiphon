"""The agent harness: budget, allow-list, trace and guardrails around a planner.

The planner proposes; this module decides what is allowed to happen. Guardrails, applied to every disposition regardless of
which planner produced it:
  1. only allow-listed tools run, and at most `max_steps` of them; every call is traced with arguments, result and timing
  2. text addressed to the agent anywhere in the evidence marks the case `injection_suspected`; such a case is never
     auto-closed as benign
  3. a benign verdict below the auto-close confidence goes to a person
  4. proposed actions must be of a configured type and target the case's own host, user or source IP; anything else is dropped
  5. no action is executed here. Each becomes an approval task; critical assets need two distinct approvers
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import insert, select, update
from sqlalchemy.engine import Connection

from bsref import db, hitl
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import schema
from serving import planners, tools

APPROVAL_KIND = "containment-approval"
_INJECTION = re.compile(
    r"ignore (all |any )?(the )?(previous|prior|above) instructions|note to (the )?ai|system note|close this alert|do not isolate"
    r"|you are now|as an ai", re.IGNORECASE)


class BudgetExceeded(Exception):
    pass


@dataclass
class Investigation:
    verdict: str
    confidence: float
    summary: str
    actions: list[dict[str, str]]
    steps: list[dict[str, Any]] = field(default_factory=list)
    injection_suspected: bool = False
    dropped_actions: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def investigate(case: dict[str, Any], agent_cfg: dict[str, Any]) -> Investigation:
    """Run one investigation. Pure with respect to the platform database: it only reads through the tools."""
    steps: list[dict[str, Any]] = []
    allowed = list(agent_cfg["tools"])

    def call(tool: str, **arguments: Any) -> dict[str, Any]:
        if len(steps) >= agent_cfg["max_steps"]:
            raise BudgetExceeded(f"step budget of {agent_cfg['max_steps']} tool calls used up")
        t0 = time.perf_counter()
        record = {"step": len(steps) + 1, "tool": tool, "arguments": arguments, "ok": False, "result": None}
        steps.append(record)
        try:
            if tool not in allowed or tool not in tools.REGISTRY:
                raise tools.ToolError(f"tool '{tool}' is not allowed")
            record["result"] = tools.REGISTRY[tool](**arguments)
            record["ok"] = True
            return record["result"]
        except TypeError as exc:
            record["result"] = {"error": "invalid arguments"}
            raise tools.ToolError("invalid arguments") from exc
        except tools.ToolError as exc:
            record["result"] = {"error": str(exc)}
            raise
        finally:
            record["ms"] = round((time.perf_counter() - t0) * 1000, 3)

    try:
        if agent_cfg["planner"] == "anthropic":
            d = planners.anthropic_planner(case, call, agent_cfg["anthropic_model"], allowed, agent_cfg["max_steps"])
        else:
            d = planners.policy(case, call)
    except BudgetExceeded as exc:
        d = {"verdict": "needs_human", "confidence": 0.0, "summary": str(exc), "actions": []}
    except Exception as exc:  # noqa: BLE001 - a planner failure must never lose the alert: it goes to a person
        d = {"verdict": "needs_human", "confidence": 0.0, "summary": f"The planner failed ({type(exc).__name__}).", "actions": []}

    inv = Investigation(str(d.get("verdict", "needs_human")), float(d.get("confidence", 0.0)), str(d.get("summary", ""))[:2000],
                        [], steps)
    if inv.verdict not in ("true_positive", "benign", "needs_human"):
        inv.verdict, inv.notes = "needs_human", ["the planner returned an unknown verdict"]
    evidence = json.dumps([s["result"] for s in steps]) + case["summary"]
    inv.injection_suspected = bool(_INJECTION.search(evidence))
    if inv.verdict == "benign" and inv.injection_suspected:
        inv.verdict = "needs_human"
        inv.notes.append("text addressed to the agent was found in the evidence: a benign verdict is not accepted automatically")
    if inv.verdict == "benign" and inv.confidence < agent_cfg["auto_close_confidence"]:
        inv.verdict = "needs_human"
        inv.notes.append("benign with low confidence: left to a person")
    own = {"isolate_host": case["host"], "disable_user": case["user"], "block_ip": case["src_ip"]}
    for a in d.get("actions") or []:
        if inv.verdict == "true_positive" and own.get(a.get("action")) == a.get("target"):
            inv.actions.append({"action": a["action"], "target": a["target"], "reason": str(a.get("reason", ""))[:500]})
        else:
            inv.dropped_actions.append(a)  # wrong type, someone else's asset, or not a true positive
    return inv


def production_agent() -> tuple[dict[str, Any], str] | None:
    cfg = load_yaml("configs/pipeline.yaml")
    try:
        artefact, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    except RegistryError:
        return None
    return artefact["agent"], manifest["version"]


def run_case(conn: Connection, case_id: str, started_by: str = "worker") -> dict[str, Any]:
    """Investigate one stored case with the production agent and persist the outcome, the trace and the proposals."""
    prod = production_agent()
    if prod is None:
        raise RegistryError("no production agent version: run `make evaluate`")
    agent_cfg, version = prod
    cfg = load_yaml("configs/pipeline.yaml")
    case = dict(conn.execute(select(schema.cases).where(schema.cases.c.case_id == case_id)).mappings().one())
    if case["status"] != "new":
        return {"case_id": case_id, "status": case["status"], "replayed": True}
    inv = investigate(case, agent_cfg)
    for s in inv.steps:
        conn.execute(insert(schema.agent_steps).values(
            case_id=case_id, step=s["step"], tool=s["tool"], arguments=db.dumps(s["arguments"]), result=db.dumps(s["result"]),
            ok=int(s["ok"]), ms=s["ms"], at=db.now()))
    status = {"benign": "closed_benign", "needs_human": "needs_human"}.get(inv.verdict, "awaiting_approval" if inv.actions else "needs_human")
    host = tools.get_host(case["host"])
    for a in inv.actions:
        action_id = f"{case_id}:{a['action']}:{a['target']}"
        rule = cfg["actions"][a["action"]]
        need = rule["critical_approvals"] if host.get("criticality") == "critical" else rule["approvals"]
        task = hitl.create_task(
            conn, APPROVAL_KIND, action_id,
            {"case_id": case_id, **a, "criticality": host.get("criticality", "unknown"), "verdict_summary": inv.summary},
            requested_by=f"agent:{version}", priority=90 if case["severity"] == "critical" else 60,
            sla_seconds=cfg["actions"]["approval_sla_seconds"], required_approvals=need)
        conn.execute(insert(schema.proposed_actions).values(action_id=action_id, case_id=case_id, action=a["action"], target=a["target"],
                                                            reason=a["reason"], status="pending", review_task_id=task))
    summary = inv.summary + ("" if not inv.notes else " [" + "; ".join(inv.notes) + "]")
    conn.execute(update(schema.cases).where(schema.cases.c.case_id == case_id).values(
        status=status, agent_verdict=inv.verdict, agent_confidence=inv.confidence, agent_summary=summary, agent_version=version,
        injection_suspected=int(inv.injection_suspected), steps=len(inv.steps), investigated_at=db.now(),
        closed_at=db.now() if status == "closed_benign" else None))
    db.audit(conn, started_by, "case.investigate", case_id,
             {"verdict": inv.verdict, "actions": inv.actions, "dropped_actions": inv.dropped_actions, "agent": version})
    return {"case_id": case_id, "status": status, "verdict": inv.verdict, "confidence": inv.confidence, "steps": len(inv.steps),
            "proposed_actions": len(inv.actions), "injection_suspected": inv.injection_suspected, "replayed": False}


def run_pending(started_by: str = "worker") -> dict[str, int]:
    """Investigate every new case. Each case is its own transaction, so one failure does not hold up the queue."""
    if production_agent() is None:
        return {"investigated": 0, "skipped_no_agent": 1}
    with db.tx() as conn:
        ids = conn.execute(select(schema.cases.c.case_id).where(schema.cases.c.status == "new").order_by(schema.cases.c.created_at)
                           ).scalars().all()
    done = 0
    for case_id in ids:
        with db.tx() as conn:
            run_case(conn, case_id, started_by)
        done += 1
    return {"investigated": done}
