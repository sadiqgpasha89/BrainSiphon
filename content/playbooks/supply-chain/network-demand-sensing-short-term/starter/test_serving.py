"""Tests for the Demand Sensing and Reconciliation FastAPI microservice."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from reconciliation import bottom_up_reconciliation, ols_reconcile
from serving import app

client = TestClient(app)


def test_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_forecast_generation_with_prebooked_lift():
    payload = {
        "series_id": "SKU_1001_STORE_42",
        "origin_day": 120,
        "horizons": [1, 2, 7],
        "recent_mean_7d": 50.0,
        "prebooked_orders_1d": 95.0,  # High prebooked orders should provide lift
        "on_hand_inventory": 40.0,
    }
    resp = client.post("/v1/forecast", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["series_id"] == "SKU_1001_STORE_42"
    assert data["lead_indicator_lift"] > 0
    # Day 1 prediction should show stockout risk because on_hand (40) < p90 demand
    assert data["predictions"][0]["stockout_risk"] is True
    # P90 >= P50 >= P10
    for p in data["predictions"]:
        assert p["p90"] >= p["p50"] >= p["p10"]


def test_hierarchical_reconciliation():
    payload = {
        "parent_id": "REGION_NORTH",
        "child_forecasts": {
            "STORE_01": 120.5,
            "STORE_02": 85.0,
            "STORE_03": 210.3,
        },
    }
    resp = client.post("/v1/reconcile", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_coherent"] is True
    assert data["reconciled_total"] == pytest.approx(415.8)


def test_ols_reconcile_linear_algebra():
    # 2 child series and 1 total parent series: S = [[1, 1], [1, 0], [0, 1]]
    S = np.array([[1.0, 1.0], [1.0, 0.0], [0.0, 1.0]])
    # Incoherent base forecasts: Total=100, StoreA=40, StoreB=50 (sum is 90 != 100)
    base = np.array([100.0, 40.0, 50.0])
    rec = ols_reconcile(base, S)
    # Reconciled total must equal sum of reconciled children
    assert rec[0] == pytest.approx(rec[1] + rec[2])

