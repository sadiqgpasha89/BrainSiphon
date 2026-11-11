"""Tests for the Ad CTR Scoring and RTB Auction FastAPI microservice."""

import pytest
from fastapi.testclient import TestClient

from serving import app

client = TestClient(app)


def test_ctr_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_score_auction_resolution():
    payload = {
        "auction_id": "auc_98231_nyc",
        "user_segment": 3,
        "placement_id": 0,
        "device_type": 1,
        "candidates": [
            {
                "ad_id": 101,
                "advertiser_id": 10,
                "bid_cpc": 2.50,
                "category": 3,
                "historical_clicks": 15,
                "historical_imps": 200,
            },
            {
                "ad_id": 102,
                "advertiser_id": 12,
                "bid_cpc": 0.50,
                "category": 1,
                "historical_clicks": 2,
                "historical_imps": 100,
            },
            {
                "ad_id": 103,
                "advertiser_id": 14,
                "bid_cpc": 4.00,
                "category": 3,
                "historical_clicks": 25,
                "historical_imps": 250,
            },
        ],
    }
    resp = client.post("/v1/score_auction", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["winning_ad_id"] == 103  # Highest eCPM (bid $4.00 * high CTR)
    assert data["clearing_ecpm"] > 0
    assert len(data["ranked_ads"]) == 3
    assert data["ranked_ads"][0]["rank"] == 1
    assert data["latency_ms"] < 25.0


def test_cold_start_ad_uses_empirical_bayes_smoothing():
    payload = {
        "auction_id": "auc_cold_start",
        "user_segment": 1,
        "placement_id": 1,
        "device_type": 1,
        "candidates": [
            {
                "ad_id": 999,
                "advertiser_id": 99,
                "bid_cpc": 1.00,
                "category": 2,
                "historical_clicks": 0,
                "historical_imps": 0,  # Zero history brand new ad
            }
        ],
    }
    resp = client.post("/v1/score_auction", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    cand = data["ranked_ads"][0]
    # Smoothed CTR must not be 0 despite 0 historical clicks
    assert cand["p_ctr"] > 0.01
    assert cand["ecpm"] > 0

