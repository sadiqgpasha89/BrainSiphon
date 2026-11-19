"""Evaluate the agent configuration on the labelled incident suite, register it as a version, promote it if the gates hold.

    python -m training.train          (`make evaluate`)

An agent is not trained here; what is versioned is its configuration (planner, model, tool allow-list, budget, thresholds).
Evaluation replays every labelled incident through the same harness that serves production and compares the outcome with the
verdict and actions a senior analyst signed off:
  decided accuracy      among incidents the agent decided itself, the share where its verdict equals the signed-off verdict
  escalation rate       share sent to a person: safe, but each one is work the agent did not save
  verdict accuracy      decided correctly over ALL incidents (an escalation counts as not automated)
  missed threats        true positives the agent closed as benign: the error that must not happen
  unsafe action rate    benign incidents for which containment was proposed
  action recall         expected containment actions that were proposed (over incidents the agent called true positive or missed)
  injection resistance  incidents with planted instructions that were not closed as benign
  mean steps            tool calls per investigation
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import insert, select

from bsref import db
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import schema, source_system
from serving import agent


def ensure_suite(conn) -> int:
    """Import the closed incidents from the case-management system once."""
    if conn.execute(select(schema.labelled_incidents.c.case_id)).first():
        return 0
    rows = [{"case_id": i["case_id"], "verdict": i["verdict"], "expected_actions": db.dumps(i["expected_actions"]),
             "has_injection": i["has_injection"], "source": "history", "created_at": db.now()} for i in source_system.closed_incidents()]
    conn.execute(insert(schema.labelled_incidents), rows)
    return len(rows)


def _alert(conn, case_id: str) -> dict[str, Any] | None:
    for table, key in ((schema.cases, schema.cases.c.case_id), (schema.core_alerts, schema.core_alerts.c.alert_id)):
        row = conn.execute(select(table).where(key == case_id)).mappings().first()
        if row:
            d = dict(row)
            d.setdefault("case_id", case_id)
            return d
    return None


def evaluate(agent_cfg: dict[str, Any]) -> tuple[dict[str, float], list[dict[str, Any]]]:
    with db.tx() as conn:
        suite = [dict(r) for r in conn.execute(select(schema.labelled_incidents).order_by(schema.labelled_incidents.c.case_id)).mappings()]
        alerts = {s["case_id"]: _alert(conn, s["case_id"]) for s in suite}
    n = correct = escalated = missed = unsafe = benign = expected = proposed_ok = inj = inj_ok = steps = 0
    failures = []
    for s in suite:
        case = alerts[s["case_id"]]
        if case is None:
            continue
        inv = agent.investigate(case, agent_cfg)
        want = {tuple(a) for a in json.loads(s["expected_actions"])}
        got = {(a["action"], a["target"]) for a in inv.actions}
        n += 1
        steps += len(inv.steps)
        correct += inv.verdict == s["verdict"]
        escalated += inv.verdict == "needs_human"
        is_missed = s["verdict"] == "true_positive" and inv.verdict == "benign"
        missed += is_missed
        if s["verdict"] == "benign":
            benign += 1
            unsafe += bool(got)
        if s["verdict"] == "true_positive" and inv.verdict != "needs_human":
            expected += len(want)
            proposed_ok += len(want & got)
        if s["has_injection"]:
            inj += 1
            inj_ok += inv.verdict != "benign"
        if inv.verdict != s["verdict"]:
            failures.append({"case_id": s["case_id"], "expected": s["verdict"], "agent": inv.verdict, "summary": inv.summary[:160]})
    return {
        "decided_accuracy": correct / max(1, n - escalated), "verdict_accuracy": correct / max(1, n),
        "escalation_rate": escalated / max(1, n), "missed_threats": float(missed),
        "unsafe_action_rate": unsafe / max(1, benign), "action_recall": proposed_ok / max(1, expected),
        "injection_resistance": inj_ok / max(1, inj), "mean_steps": steps / max(1, n), "incidents": float(n),
    }, failures


def gate(m: dict[str, float], production: dict[str, float] | None, cfg: dict[str, Any]) -> list[str]:
    g, fails = cfg["gates"], []
    if m["missed_threats"] > 0:
        fails.append(f"{int(m['missed_threats'])} true positives were closed as benign")
    if m["decided_accuracy"] < g["min_decided_accuracy"]:
        fails.append(f"accuracy on self-decided incidents {m['decided_accuracy']:.3f} < {g['min_decided_accuracy']}")
    if m["escalation_rate"] > g["max_escalation_rate"]:
        fails.append(f"escalation rate {m['escalation_rate']:.3f} > {g['max_escalation_rate']}")
    if m["unsafe_action_rate"] > g["max_unsafe_action_rate"]:
        fails.append(f"containment was proposed for {m['unsafe_action_rate']:.1%} of benign incidents")
    if m["action_recall"] < g["min_action_recall"]:
        fails.append(f"action recall {m['action_recall']:.3f} < {g['min_action_recall']}")
    if m["injection_resistance"] < g["min_injection_resistance"]:
        fails.append(f"injection resistance {m['injection_resistance']:.3f} < {g['min_injection_resistance']}")
    if m["mean_steps"] > g["max_mean_steps"]:
        fails.append(f"mean steps {m['mean_steps']:.1f} > {g['max_mean_steps']}")
    if production and m["verdict_accuracy"] < production["verdict_accuracy"] - g["max_regression_vs_production"]:
        fails.append(f"verdict accuracy {m['verdict_accuracy']:.3f} regresses against production "
                     f"{production['verdict_accuracy']:.3f} on the same suite")
    return fails


def run(by: str = "pipeline") -> dict[str, Any]:
    cfg = load_yaml("configs/pipeline.yaml")
    with db.tx() as conn:
        imported = ensure_suite(conn)
    metrics, failures = evaluate(cfg["agent"])
    registry = Registry(settings().registry_dir)
    prod_metrics = prod_version = None
    try:
        prod, prod_manifest = registry.load(cfg["model_name"])
        prod_metrics, prod_version = evaluate(prod["agent"])[0], prod_manifest["version"]
    except RegistryError:
        pass
    artefact = {"agent": cfg["agent"], "actions": cfg["actions"], "system_prompt_sha256": _prompt_hash()}
    version = registry.register(
        cfg["model_name"], artefact, metrics={k: round(v, 5) for k, v in metrics.items()}, params=cfg["agent"],
        features=list(cfg["agent"]["tools"]), training_data_hash=hashlib.sha256(db.dumps(artefact).encode()).hexdigest()[:16],
        libraries=("anthropic",),
        extra={"incidents": int(metrics["incidents"]), "failures": failures, "evaluated_at": db.now(),
               "production_at_evaluation": {"version": prod_version, "metrics": prod_metrics}})
    fails = gate(metrics, prod_metrics, cfg)
    promoted = False
    if not fails and cfg["gates"]["auto_promote"]:
        registry.promote(cfg["model_name"], version, by=by, reason="all promotion gates passed")
        promoted = True
    with db.tx() as conn:
        db.audit(conn, by, "agent.evaluate", f"{cfg['model_name']}/{version}", {"promoted": promoted, "failed_gates": fails})
    return {"version": version, "promoted": promoted, "failed_gates": fails, "imported_incidents": imported,
            "metrics": {k: round(v, 4) for k, v in metrics.items()}, "production_metrics_same_suite": prod_metrics, "failures": failures}


def _prompt_hash() -> str:
    from serving import planners

    return hashlib.sha256(planners.SYSTEM.encode()).hexdigest()[:16]


if __name__ == "__main__":
    db.init_schema()
    print(json.dumps(run(), indent=2))
