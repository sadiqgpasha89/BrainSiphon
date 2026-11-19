"""The closed loop: actuals arrive, forecasts are scored, retraining is triggered, the next run uses the new model."""

from data import source_system, worker
from monitoring import job
from training import retrain


def test_actuals_accuracy_retraining_and_next_run(world, client, tokens):
    assert retrain.triggers() == []
    assert client.get("/v1/accuracy", headers=tokens["planner"]).json() == {"rows": 0}  # nothing has happened yet
    emitted = source_system.advance()["emitted"]
    out = worker.run_once()["ingest"]
    assert out["sales"] == emitted["sale"] == 45 * 21 and out["restatements"] == emitted["restate"]

    acc = client.get("/v1/accuracy", headers=tokens["planner"]).json()
    assert acc["rows"] > 500 and acc["wape_model"] < acc["wape_baseline"] and "override_wape" in acc
    report = job.run()
    m = report["metrics"]
    assert m["days_since_last_run"] == 21 and "ForecastRunStale" in report["alerts_firing"]
    assert m["live_forecast_value_added"] > 0 and m["model_age_days"] == 21 and m["dead_letters"] == 0

    result = retrain.run()
    assert result["retrained"] and "new sales days" in result["reasons"][0]
    assert result["result"]["version"] == "v0002" and result["result"]["production_wape_same_origins"] is not None
    if not result["result"]["promoted"]:
        assert client.post("/v1/models/v0002/promote", json={"reason": "test promotion"}, headers=tokens["admin"]).status_code == 200
    new_run = client.post("/v1/runs", headers=tokens["planner"]).json()
    assert new_run["model_version"] == "v0002" and not new_run["replayed"]
    assert "ForecastRunStale" not in job.run()["alerts_firing"]  # the alert resolves by itself

    back = client.post("/v1/models/rollback", json={"reason": "test rollback"}, headers=tokens["admin"]).json()
    assert back == {"production": "v0001"}
    assert client.post("/v1/runs", headers=tokens["planner"]).json()["model_version"] == "v0001"
