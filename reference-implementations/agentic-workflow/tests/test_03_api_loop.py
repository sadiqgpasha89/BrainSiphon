"""Ingestion, investigations, approval-gated actions (including four-eyes), analyst feedback and the closed loop."""

from sqlalchemy import func, select

from bsref import db
from data import schema, source_system, worker
from monitoring import job
from training import retrain


def _isolated(host):
    with db.tx(db.source_engine()) as c:
        return c.execute(select(schema.core_hosts.c.isolated).where(schema.core_hosts.c.host == host)).scalar_one()


def test_alerts_become_cases_once_and_wait_until_an_agent_version_exists(world):
    first, second = world["before_agent"], world["after_agent"]
    assert first["ingest"] == {"cases_opened": 6, "duplicates": 1, "quarantined": 1} and first["agent"] == {"investigated": 0, "skipped_no_agent": 1}
    assert second["consumer"]["processed"] == 0 and second["agent"] == {"investigated": 6}
    with db.tx() as c:
        assert "rule" in c.execute(select(db.quarantine.c.violations)).scalar_one()
        assert c.execute(select(func.count()).select_from(schema.agent_steps)).scalar_one() == 18  # 6 cases x 3 traced tool calls


def test_roles_are_enforced(client, tokens):
    assert client.get("/v1/cases").status_code == 401
    assert client.get("/v1/approvals", headers=tokens["analyst"]).status_code == 403
    assert client.post("/v1/agent/evaluate", headers=tokens["responder"]).status_code == 403
    assert client.post("/v1/approvals/1/decision", json={"decision": "approve"}, headers=tokens["analyst"]).status_code == 403


def test_nothing_is_executed_without_approval_and_critical_assets_need_two_people(client, tokens, world):
    tasks = client.get("/v1/approvals", headers=tokens["responder"]).json()
    by_target = {t["payload"]["target"]: t for t in tasks}
    assert all(t["requested_by"].startswith("agent:") for t in tasks)
    crit = next(t for t in tasks if t["required_approvals"] == 2)
    host = crit["payload"]["target"]
    assert crit["payload"]["criticality"] == "critical" and _isolated(host) == 0 and _isolated("ws-l006") == 0

    one = client.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=tokens["responder"]).json()
    assert one["task"]["status"] == "open" and one["action"]["status"] == "pending" and _isolated(host) == 0
    assert client.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=tokens["responder"]).status_code == 409
    two = client.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=tokens["lead"]).json()
    assert two["action"]["status"] == "executed" and _isolated(host) == 1
    assert client.get(f"/v1/cases/{crit['payload']['case_id']}", headers=tokens["analyst"]).json()["status"] == "contained"

    normal = by_target["ws-l006"]
    assert client.post(f"/v1/approvals/{normal['id']}/decision", json={"decision": "reject", "notes": "false alarm"},
                       headers=tokens["responder"]).json()["action"]["status"] == "rejected"
    assert _isolated("ws-l006") == 0  # rejected: never executed, and the case goes back to a person
    assert client.get(f"/v1/cases/{normal['payload']['case_id']}", headers=tokens["analyst"]).json()["status"] == "needs_human"
    with db.tx() as c:
        actions = c.execute(select(db.audit_log.c.action)).scalars().all()
    assert {"case.investigate", "approval.approve", "approval.reject", "action.execute", "action.rejected"} <= set(actions)


def test_trace_is_complete_and_investigation_is_idempotent(client, tokens):
    k = client.get("/v1/cases/L-0003", headers=tokens["analyst"]).json()
    assert [s["tool"] for s in k["trace"]] == ["get_host", "auth_history", "intel_lookup"] and all(s["ok"] for s in k["trace"])
    assert k["agent_verdict"] == "true_positive" and {a["action"] for a in k["actions"]} == {"disable_user", "block_ip"}
    assert client.post("/v1/cases/L-0003/investigate", headers=tokens["analyst"]).json()["replayed"] is True
    assert client.get("/v1/cases/X-0000", headers=tokens["analyst"]).status_code == 404


def test_new_alerts_analyst_feedback_monitoring_and_reevaluation(client, tokens):
    assert retrain.triggers() == []
    assert source_system.advance() == {"live_alerts": 6}
    out = worker.run_once()
    assert out["ingest"]["cases_opened"] == 6 and out["agent"] == {"investigated": 6}
    truth = source_system.truth_for_live()
    cases = client.get("/v1/cases", headers=tokens["analyst"]).json()
    assert len(cases) == 12
    assert not [k for k in cases if k["agent_verdict"] == "benign" and truth[k["case_id"]]["verdict"] == "true_positive"]
    injected = [k for k in cases if k["injection_suspected"]]
    assert len(injected) == 1 and injected[0]["agent_verdict"] == "true_positive"
    for k in cases:  # the analyst gives every case its final verdict
        r = client.post(f"/v1/cases/{k['case_id']}/verdict", json={"verdict": truth[k["case_id"]]["verdict"]}, headers=tokens["analyst"])
        assert r.status_code == 200
    assert client.get("/v1/cases?status=needs_human", headers=tokens["analyst"]).json() == []

    report = job.run()
    m = report["metrics"]
    assert m["uninvestigated_cases"] == 0 and m["live_missed_threats"] == 0 and m["tool_error_rate"] == 0 and m["override_rate"] == 0
    assert m["labelled_incidents"] == 36 and "AgentMissedThreat" not in report["alerts_firing"]

    result = retrain.run()
    assert result["evaluated"] and "12 cases labelled by analysts" in result["reasons"][0]
    r = result["result"]
    assert r["version"] == "v0002" and r["metrics"]["incidents"] == 36 and r["production_metrics_same_suite"] is not None
    back = client.post("/v1/agent/rollback", json={"reason": "test rollback"}, headers=tokens["lead"])
    assert (back.status_code, back.json()) == (200, {"production": "v0001"}) if r["promoted"] else back.status_code == 409


def test_health_metrics_console_and_alert_rules(client):
    from bsref import observability
    from bsref.config import home

    assert client.get("/readyz").json()["checks"] == {"database": True, "production_agent": True}
    assert "agent_approval_decisions_total" in client.get("/metrics").text and "SOC triage console" in client.get("/ui/").text
    assert (home() / "monitoring" / "prometheus-rules.yml").read_text() == observability.render_prometheus_rules(observability.load_rules())
