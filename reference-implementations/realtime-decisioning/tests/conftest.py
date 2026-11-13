"""One small simulated world, built once per test session in a temporary database and registry.

The fixtures run the real pipeline (seed -> CDC -> ingest -> train -> advance -> ingest); the tests then assert on it.
"""

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def world(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("rt")
    # TEST_DATABASE_URL=postgresql+psycopg://... runs the same suite against PostgreSQL (use an empty database)
    os.environ.update(
        APP_HOME=str(ROOT), DATABASE_URL=os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp / 'app.db'}", SOURCE_DATABASE_URL="",
        MODEL_REGISTRY_DIR=str(tmp / "registry"), AUTH_MODE="local", JWT_SECRET="t" * 48, ALERT_WEBHOOK_URL="",
        USER_SVC_GATEWAY_PASSWORD="gw-test", USER_ANALYST_PASSWORD="an-test", USER_ML_ADMIN_PASSWORD="ad-test",
    )
    from bsref import config, db

    config.reset_settings()
    db.reset_engines()
    from data import source_system, worker
    from training import train

    db.init_schema()
    seeded = source_system.seed(cards=300)
    first_ingest = worker.run_once()
    model = train.run()
    return {"seeded": seeded, "first_ingest": first_ingest, "first_model": model, "tmp": tmp}


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

    return {"gateway": get("svc-gateway", "gw-test"), "analyst": get("analyst", "an-test"), "admin": get("ml-admin", "ad-test")}
