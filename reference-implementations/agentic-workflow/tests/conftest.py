"""The real pipeline, run once per session in a temporary database and registry: seed -> evaluate -> CDC -> investigate."""

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def world(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("agent")
    # TEST_DATABASE_URL=postgresql+psycopg://... runs the same suite against PostgreSQL (use an empty database)
    os.environ.update(
        APP_HOME=str(ROOT), DATABASE_URL=os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp / 'app.db'}", SOURCE_DATABASE_URL="",
        MODEL_REGISTRY_DIR=str(tmp / "registry"), AUTH_MODE="local", JWT_SECRET="t" * 48, ALERT_WEBHOOK_URL="",
        USER_ANALYST_PASSWORD="an-test", USER_RESPONDER_PASSWORD="re-test", USER_SOC_LEAD_PASSWORD="le-test",
    )
    from bsref import config, db

    config.reset_settings()
    db.reset_engines()
    from data import source_system, worker
    from training import train

    db.init_schema()
    seeded = source_system.seed()
    before_agent = worker.run_once()          # no agent version yet: cases are opened but nothing investigates them
    evaluation = train.run()
    return {"seeded": seeded, "before_agent": before_agent, "evaluation": evaluation, "after_agent": worker.run_once()}


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

    return {"analyst": get("analyst", "an-test"), "responder": get("responder", "re-test"), "lead": get("soc-lead", "le-test")}
