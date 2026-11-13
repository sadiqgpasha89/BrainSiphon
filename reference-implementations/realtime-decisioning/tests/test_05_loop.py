"""The closed loop: new data and labels arrive, monitoring runs, retraining is triggered, the API hot-swaps or rolls back."""

from bsref.config import settings
from bsref.registry import Registry
from data import source_system, worker
from monitoring import job
from training import retrain


def test_new_data_monitoring_retraining_and_rollback(world, client, tokens):
    assert retrain.triggers() == []  # nothing new yet: no retrain
    emitted = source_system.advance()["emitted"]
    out = worker.run_once()
    assert out["ingest"]["transactions"] == emitted["txn"] > 500 and out["ingest"]["chargebacks"] == emitted["chargeback"] > 0

    report = job.run()
    m = report["metrics"]
    assert m["consumer_lag"] == 0 and m["dead_letters"] == 0 and m["quarantine_rate"] < 0.01
    assert 7.5 < m["model_age_days"] < 8.5 and "max_feature_psi" in m and "matured_pr_auc" in m
    assert "IngestDeadLetters" not in report["alerts_firing"]

    result = retrain.run(force=True)
    assert result["retrained"] and result["result"]["version"] == "v0002"
    assert result["result"]["production_pr_auc_same_test"] is not None  # compared with production on the same window
    reg = Registry(settings().registry_dir)
    if not result["result"]["promoted"]:  # the gate may legitimately refuse; promote by hand to exercise the swap
        r = client.post("/v1/models/v0002/promote", json={"reason": "test promotion"}, headers=tokens["admin"])
        assert r.status_code == 200
    else:
        from api.app import scorer

        scorer.refresh(force=True)
    assert client.get("/v1/models", headers=tokens["admin"]).json()["serving"] == "v0002"

    back = client.post("/v1/models/rollback", json={"reason": "test rollback"}, headers=tokens["admin"]).json()
    assert back == {"production": "v0001", "serving": "v0001"}
    assert [h["action"] for h in reg.history("fraud-scorer")][-1] == "rollback"


def test_no_production_model_means_rules_fallback(world, monkeypatch, tmp_path):
    from sqlalchemy import func, select

    from bsref import db
    from data import schema
    from serving.scorer import Scorer

    monkeypatch.setenv("MODEL_REGISTRY_DIR", str(tmp_path / "empty"))
    from bsref import config

    config.reset_settings()
    try:
        s = Scorer()
        with db.tx() as c:
            card = c.execute(select(func.min(schema.raw_transactions.c.card_id))).scalar_one()
            d = s.decide(c, {"txn_id": "fb-000001", "card_id": card, "merchant_id": 1, "device_id": 1, "amount": 10.0,
                             "rail": "card", "country": "IN", "event_time": 2_000_000_000.0})
        assert d.fallback and d.model_version == "none" and d.action in ("ALLOW", "STEP_UP")  # rules never BLOCK
    finally:
        monkeypatch.undo()
        config.reset_settings()
