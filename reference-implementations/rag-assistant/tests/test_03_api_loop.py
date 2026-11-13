"""The API (authorisation, feedback, review) and the closed loop (edits -> stale index -> re-index -> hot swap -> rollback)."""

from sqlalchemy import select

from bsref import db
from data import schema, source_system, worker
from monitoring import job
from training import retrain


def _ask(client, who, q):
    return client.post("/v1/ask", json={"question": q}, headers=who)


def test_roles_and_request_contract(client, tokens):
    q = {"question": "How long are idempotency keys stored?"}
    assert client.post("/v1/ask", json=q).status_code == 401
    assert client.get("/v1/reviews", headers=tokens["customer"]).status_code == 403
    assert client.post("/v1/index/rebuild", headers=tokens["writer"]).status_code == 403
    assert client.post("/v1/ask", json={**q, "audience": "internal"}, headers=tokens["customer"]).status_code == 422
    assert client.post("/v1/ask", json={"question": "x"}, headers=tokens["customer"]).status_code == 422


def test_answers_carry_citations_and_respect_the_readers_role(client, tokens):
    a = _ask(client, tokens["customer"], "For how long are failed webhook deliveries retried?").json()
    assert a["status"] == "answered" and "72 hours" in a["answer"] and a["citations"][0]["doc_id"] == "webhooks"
    q = "How often does the incident commander post updates during a SEV1?"
    assert _ask(client, tokens["customer"], q).json()["status"] == "abstained"
    assert "30 minutes" in _ask(client, tokens["employee"], q).json()["answer"]
    with db.tx() as c:
        aud = c.execute(select(schema.answers.c.audience).where(schema.answers.c.answer_id == a["answer_id"])).scalar_one()
    assert aud == "public"


def test_feedback_review_and_evaluation_set_growth(client, tokens):
    a = _ask(client, tokens["customer"], "Which regions are the data centres located in?").json()
    assert a["status"] == "abstained"  # an abstention is queued for the writers automatically
    b = _ask(client, tokens["customer"], "Which Python version does the SDK require?").json()
    assert client.post(f"/v1/answers/{b['answer_id']}/feedback", json={"rating": "down"}, headers=tokens["customer"]).status_code == 202
    assert client.post("/v1/answers/nope/feedback", json={"rating": "up"}, headers=tokens["customer"]).status_code == 404
    tasks = {t["subject_id"]: t for t in client.get("/v1/reviews", headers=tokens["writer"]).json()}
    assert tasks[a["answer_id"]]["payload"]["reason"] == "abstained" and tasks[b["answer_id"]]["payload"]["reason"] == "thumbs_down"
    before = client.get("/v1/monitoring/summary", headers=tokens["writer"]).json()["eval_examples"]
    tid = tasks[a["answer_id"]]["id"]
    assert client.post(f"/v1/reviews/{tid}/decision", json={"resolution": "answerable"}, headers=tokens["writer"]).status_code == 422
    assert client.post(f"/v1/reviews/{tid}/decision", json={"resolution": "not_answerable"}, headers=tokens["writer"]).status_code == 200
    assert client.post(f"/v1/reviews/{tid}/decision", json={"resolution": "dismiss"}, headers=tokens["writer"]).status_code == 409
    client.post(f"/v1/reviews/{tasks[b['answer_id']]['id']}/decision", json={"resolution": "dismiss"}, headers=tokens["writer"])
    assert client.get("/v1/monitoring/summary", headers=tokens["writer"]).json()["eval_examples"] == before + 1


def test_edits_make_the_index_stale_and_reindexing_fixes_it(client, tokens):
    q = "How often is sandbox data reset?"
    assert "every Sunday" in _ask(client, tokens["customer"], q).json()["answer"]
    assert retrain.triggers() == []
    assert source_system.advance() == {"updated": 1, "deleted": 1, "published": 1}
    out = worker.run_once()["ingest"]
    assert out["indexed_documents"] == 2 and out["deleted"] == 1
    report = job.run()
    assert report["metrics"]["stale_documents"] == 3 and "RagIndexStale" in report["alerts_firing"]
    assert "every Sunday" in _ask(client, tokens["customer"], q).json()["answer"]  # still the old index: that is the alert's point

    r = client.post("/v1/index/rebuild", headers=tokens["admin"]).json()
    assert r["version"] == "v0002" and r["promoted"], r["failed_gates"]
    assert r["production_metrics_same_set"] is not None
    fresh = _ask(client, tokens["customer"], q).json()
    assert fresh["index_version"] == "v0002" and "every day" in fresh["answer"] and fresh["citations"][0]["doc_version"] == 2
    assert _ask(client, tokens["customer"], "How many operations does the v1 batch endpoint accept?").json()["status"] == "abstained"
    assert "15 minutes" in _ask(client, tokens["customer"], "How long can a streaming export stay open?").json()["answer"]
    after = job.run()
    assert after["metrics"]["stale_documents"] == 0 and "RagIndexStale" not in after["alerts_firing"]

    back = client.post("/v1/index/rollback", json={"reason": "test rollback"}, headers=tokens["admin"]).json()
    assert back == {"production": "v0001", "serving": "v0001"}
    assert "every Sunday" in _ask(client, tokens["customer"], q).json()["answer"]


def test_health_metrics_page_and_alert_rules(client):
    from bsref import observability
    from bsref.config import home

    assert client.get("/readyz").json()["checks"] == {"database": True, "production_index": True}
    assert "rag_answers_total" in client.get("/metrics").text and "Kestrel docs assistant" in client.get("/ui/").text
    assert (home() / "monitoring" / "prometheus-rules.yml").read_text() == observability.render_prometheus_rules(observability.load_rules())
