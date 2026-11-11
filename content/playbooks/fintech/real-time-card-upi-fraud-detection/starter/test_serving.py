"""Tests for the production-grade fraud scoring FastAPI service and audit ledger."""

import pytest
from fastapi.testclient import TestClient

from ledger import DecisionLedger
from serving import app

client = TestClient(app)


def test_health_endpoints():
    live = client.get("/health/liveness")
    assert live.status_code == 200
    assert live.json()["status"] == "healthy"

    ready = client.get("/health/readiness")
    assert ready.status_code == 200
    assert ready.json()["rail"] == "card_upi_dual"


def test_score_allow_decision():
    payload = {
        "txn_id": "txn_test_allow_001",
        "card_id": 123456,
        "amount": 25.50,
        "merchant_id": 8801,
        "device_id": 9901,
        "rail": "card",
        "features": {"card_cnt_1h": 1.0, "card_sum_1h": 50.0},
    }
    resp = client.post("/v1/score", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "ALLOW"
    assert data["p_fraud"] < 0.082
    assert data["latency_ms"] < 15.0  # P99 target
    assert not data["fallback_applied"]


def test_score_block_decision_on_extreme_anomaly():
    payload = {
        "txn_id": "txn_test_block_002",
        "card_id": 888888,
        "amount": 9500.0,
        "merchant_id": 404,
        "device_id": 555,
        "rail": "card",
        "features": {"card_cnt_1h": 8.0, "card_sum_1h": 100.0},  # 95x jump in amount + high velocity
    }
    resp = client.post("/v1/score", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] in ("BLOCK", "STEP_UP")
    assert data["p_fraud"] > 0.10


def test_decision_ledger_cryptographic_integrity():
    ledger = DecisionLedger()
    ledger.append("tx1", "card", 10.0, 0.01, "ALLOW", "v1")
    ledger.append("tx2", "card", 500.0, 0.12, "STEP_UP", "v1")
    ledger.append("tx3", "upi", 5000.0, 0.88, "BLOCK", "v1")

    assert ledger.count() == 3
    assert ledger.verify_chain() is True

    # Tamper with an entry
    ledger.entries[1]["decision"] = "ALLOW"
    assert ledger.verify_chain() is False

