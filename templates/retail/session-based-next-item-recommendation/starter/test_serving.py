"""Tests for the Retail Session Recommendation FastAPI serving service and diversity reranker."""

import pytest
from fastapi.testclient import TestClient

from reranker import rerank_candidates
from serving import app

client = TestClient(app)


def test_recs_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_nominal_recommendations_satisfy_diversity():
    payload = {
        "session_id": "sess_shopper_01",
        "current_item_id": 42,
        "session_history": [10, 15],
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "top_k": 5,
    }
    resp = client.post("/v1/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert not data["is_bot_traffic"]
    recs = data["recommendations"]
    assert len(recs) <= 5
    # Must not contain current item or history items
    rec_ids = [r["item_id"] for r in recs]
    assert 42 not in rec_ids
    assert 10 not in rec_ids
    assert 15 not in rec_ids

    # Diversity check: at most 2 items per category
    cats = [r["category"] for r in recs]
    for c in set(cats):
        assert cats.count(c) <= 2


def test_bot_crawler_traffic_triggers_fast_fallback():
    payload = {
        "session_id": "sess_crawler_99",
        "current_item_id": 5,
        "session_history": [1, 2, 3],
        "user_agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
        "top_k": 5,
    }
    resp = client.post("/v1/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_bot_traffic"] is True


def test_reranker_category_cap():
    candidates = [
        (101, 0.95, "shoes"),
        (102, 0.90, "shoes"),
        (103, 0.85, "shoes"),  # 3rd shoes item should be skipped
        (201, 0.80, "hats"),
        (301, 0.75, "shirts"),
    ]
    result = rerank_candidates(candidates, history=[], max_per_category=2, top_k=5)
    result_cats = [r[2] for r in result]
    assert result_cats.count("shoes") == 2
    assert 103 not in [r[0] for r in result]

