"""Batch run, forecast serving, authorisation, planner review and overrides."""

import pytest
from sqlalchemy import select

from bsref import db
from bsref.validation import DataValidationError
from data import schema
from serving import batch


def test_run_is_complete_idempotent_and_holds_implausible_series(world):
    run = world["run"]
    assert run["series"] == 45 and run["status"] == "complete" and run["completeness"] >= 0.9
    again = batch.run(started_by="test")
    assert again["replayed"] and again["run_id"] == run["run_id"]
    with db.tx() as c:
        rows = c.execute(select(schema.forecasts.c.status, schema.forecasts.c.final, schema.forecasts.c.baseline,
                                schema.forecasts.c.p10, schema.forecasts.c.p50, schema.forecasts.c.p90)).all()
    assert len(rows) == 45 * 14
    assert all(r[3] <= r[4] <= r[5] and r[3] >= 0 for r in rows)
    assert all(r[1] == r[2] for r in rows if r[0] == "held") and all(r[1] == r[4] for r in rows if r[0] == "published")


def test_roles_are_enforced(client, tokens):
    q = {"store_id": "S001", "sku": "K0001"}
    assert client.get("/v1/forecasts", params=q).status_code == 401
    assert client.get("/v1/forecasts", params=q, headers=tokens["consumer"]).status_code == 200
    assert client.post("/v1/runs", headers=tokens["consumer"]).status_code == 403
    assert client.get("/v1/reviews", headers=tokens["consumer"]).status_code == 403
    assert client.post("/v1/models/rollback", json={"reason": "not allowed"}, headers=tokens["planner"]).status_code == 403


def test_planner_decisions_change_what_consumers_receive_and_are_audited(client, tokens, world):
    from bsref import hitl

    with db.tx() as c:  # hold one series by hand so the test does not depend on what the model flagged
        tid = hitl.create_task(c, batch.REVIEW_KIND, f"{world['run']['run_id']}:S002:K0003",
                               {"run_id": world["run"]["run_id"], "store_id": "S002", "sku": "K0003", "forecast_14d": 1, "recent_14d": 1,
                                "ratio": 3.0}, requested_by="forecast-run")
    q = {"store_id": "S002", "sku": "K0003"}
    assert any(t["id"] == tid for t in client.get("/v1/reviews", headers=tokens["planner"]).json())
    r = client.post(f"/v1/reviews/{tid}/decision", json={"verdict": "override", "factor": 0.5, "notes": "store refit"},
                    headers=tokens["planner"])
    assert r.json()["status"] == "approved"
    f = client.get("/v1/forecasts", params=q, headers=tokens["consumer"]).json()
    assert f["status"] == "overridden" and all(abs(d["final"] - d["p50"] * 0.5) < 0.01 for d in f["days"])
    assert client.post(f"/v1/reviews/{tid}/decision", json={"verdict": "accept_model"}, headers=tokens["admin"]).status_code == 409
    o = client.post("/v1/forecasts/override", json={**q, "factor": 1.0, "reason": "back to the model"}, headers=tokens["planner"])
    assert o.status_code == 200
    assert client.post("/v1/forecasts/override", json={**q, "factor": 99, "reason": "typo guard"}, headers=tokens["planner"]).status_code == 422
    with db.tx() as c:
        actions = c.execute(select(db.audit_log.c.action)).scalars().all()
        labels = c.execute(select(db.feedback.c.label).where(db.feedback.c.subject_type == "forecast")).scalars().all()
    assert {"forecast.review", "forecast.override", "forecast.run"} <= set(actions) and labels.count("override") == 2


def test_health_metrics_console_and_alert_rules(client, tokens):
    from bsref import observability
    from bsref.config import home

    assert client.get("/readyz").json()["checks"] == {"database": True, "production_model": True}
    assert "forecast_requests_total" in client.get("/metrics").text
    assert "Demand planner console" in client.get("/ui/").text
    assert (home() / "monitoring" / "prometheus-rules.yml").read_text() == observability.render_prometheus_rules(observability.load_rules())


def test_a_run_is_refused_when_too_few_series_reported(world, monkeypatch):
    from features import build as fb

    monkeypatch.setattr(fb.Panel, "completeness", lambda self, idx: 0.5)
    with pytest.raises(DataValidationError, match="run refused"):
        batch.run(started_by="test")
