"""The API: authorisation, idempotency, contract enforcement, human review, feedback, model operations, fallback."""

import time

from sqlalchemy import select

from bsref import db
from data import schema


def _txn(suffix, **kw):
    return {"txn_id": f"api-{suffix}", "card_id": 4242, "merchant_id": 12, "device_id": 104242, "amount": 30.0,
            "rail": "card", "country": "IN", "event_time": time.time(), **kw}


def test_roles_are_enforced(client, tokens):
    t = _txn("authz1")
    assert client.post("/v1/decisions", json=t).status_code == 401
    assert client.post("/v1/decisions", json=t, headers=tokens["analyst"]).status_code == 403
    assert client.get("/v1/reviews", headers=tokens["gateway"]).status_code == 403
    assert client.post("/v1/models/rollback", json={"reason": "not allowed"}, headers=tokens["analyst"]).status_code == 403
    assert client.get("/v1/models", headers=tokens["analyst"]).status_code == 200


def test_decision_is_idempotent_and_contract_checked(client, tokens):
    t = _txn("idem01")
    a = client.post("/v1/decisions", json=t, headers=tokens["gateway"])
    b = client.post("/v1/decisions", json={**t, "amount": 99999.0}, headers=tokens["gateway"])  # a retry cannot change it
    assert a.status_code == 200 and a.json() == b.json() and a.json()["fallback"] is False
    for bad in ({"amount": 0}, {"rail": "wire"}, {"country": "india"}, {"extra": 1}):
        assert client.post("/v1/decisions", json={**_txn("bad001"), **bad}, headers=tokens["gateway"]).status_code == 422


def _blocked(client, tokens, suffix):
    """Force a BLOCK by lowering the serving model's threshold for one request: this test is about the workflow that follows
    a block, not about what the model has learnt (tests/test_03_training.py and scripts/verify.py cover that)."""
    from api.app import scorer

    scorer.refresh(force=True)
    saved, scorer.model.block_threshold = scorer.model.block_threshold, -1.0
    try:
        t = _txn(suffix, device_id=990001, amount=5000.0, country="AE", merchant_id=399)
        r = client.post("/v1/decisions", json=t, headers=tokens["gateway"]).json()
    finally:
        scorer.model.block_threshold = saved
    return t, r


def test_block_creates_a_review_that_ends_as_a_training_label(client, tokens):
    t, r = _blocked(client, tokens, "blk001")
    assert r["action"] == "BLOCK", r
    task = next(x for x in client.get("/v1/reviews", headers=tokens["analyst"]).json() if x["subject_id"] == t["txn_id"])
    assert client.post(f"/v1/reviews/{task['id']}/claim", headers=tokens["analyst"]).json()["assignee"] == "analyst"
    assert client.post(f"/v1/reviews/{task['id']}/claim", headers=tokens["admin"]).status_code == 409
    done = client.post(f"/v1/reviews/{task['id']}/decision", json={"verdict": "genuine", "notes": "customer called"},
                       headers=tokens["analyst"])
    assert done.json()["status"] == "rejected"  # the block was overturned
    assert client.post(f"/v1/reviews/{task['id']}/decision", json={"verdict": "fraud"}, headers=tokens["admin"]).status_code == 409
    with db.tx() as c:
        assert tuple(c.execute(select(schema.labels.c.is_fraud, schema.labels.c.source)
                               .where(schema.labels.c.txn_id == t["txn_id"])).one()) == (0, "analyst")
        actions = c.execute(select(db.audit_log.c.action)).scalars().all()
    assert "review.decide" in actions and "login" in actions


def test_step_up_outcome_is_recorded_as_feedback(client, tokens):
    t = _txn("out001")
    client.post("/v1/decisions", json=t, headers=tokens["gateway"])
    assert client.post("/v1/outcomes", json={"txn_id": t["txn_id"], "outcome": "step_up_failed"},
                       headers=tokens["gateway"]).status_code == 202
    assert client.post("/v1/outcomes", json={"txn_id": "nope-000", "outcome": "step_up_passed"},
                       headers=tokens["gateway"]).status_code == 404
    with db.tx() as c:
        assert c.execute(select(schema.labels.c.source).where(schema.labels.c.txn_id == t["txn_id"])).scalar_one() == "step-up"


def test_metrics_health_and_console(client, tokens):
    body = client.get("/metrics").text
    assert 'fraud_decisions_total{action="ALLOW"' in body and "fraud_scoring_duration_ms_bucket" in body
    assert client.get("/readyz").json()["checks"] == {"database": True, "production_model": True}
    assert "Fraud review console" in client.get("/ui/").text
    assert client.get("/v1/monitoring/summary", headers=tokens["analyst"]).json()["model_version"].startswith("v")


def test_alert_rules_file_is_in_sync_with_its_source():
    from bsref import observability
    from bsref.config import home

    assert (home() / "monitoring" / "prometheus-rules.yml").read_text() == observability.render_prometheus_rules(
        observability.load_rules())
