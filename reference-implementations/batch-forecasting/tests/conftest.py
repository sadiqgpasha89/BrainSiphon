"""One small simulated world (3 stores x 15 products), built once per session in a temporary database and registry."""

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def world(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("fc")
    # TEST_DATABASE_URL=postgresql+psycopg://... runs the same suite against PostgreSQL (use an empty database)
    os.environ.update(
        APP_HOME=str(ROOT), DATABASE_URL=os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp / 'app.db'}", SOURCE_DATABASE_URL="",
        MODEL_REGISTRY_DIR=str(tmp / "registry"), AUTH_MODE="local", JWT_SECRET="t" * 48, ALERT_WEBHOOK_URL="",
        USER_SVC_REPLENISHMENT_PASSWORD="rp-test", USER_PLANNER_PASSWORD="pl-test", USER_ML_ADMIN_PASSWORD="ad-test",
    )
    from bsref import config, db

    config.reset_settings()
    db.reset_engines()
    from data import source_system, worker
    from serving import batch
    from training import train

    db.init_schema()
    seeded = source_system.seed(stores=3, skus=15)
    ingest = worker.run_once()
    model = train.run()
    run = batch.run(started_by="test")
    return {"seeded": seeded, "ingest": ingest, "model": model, "run": run}


@pytest.fixture(scope="session")
def client(world):
    from fastapi.testclient import TestClient

    from api.app import app

    return TestClient(app)


@pytest.fixture(scope="session")
def tokens(client):
    def get(user, password):
        r = client.post("/auth/token", data={"username": user, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return {"consumer": get("svc-replenishment", "rp-test"), "planner": get("planner", "pl-test"), "admin": get("ml-admin", "ad-test")}
