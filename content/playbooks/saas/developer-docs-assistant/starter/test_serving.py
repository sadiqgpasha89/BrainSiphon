"""Tests for the Developer Docs Assistant FastAPI serving service and Ragas evaluation."""

import pytest
from fastapi.testclient import TestClient

from serving import app

client = TestClient(app)


def test_docs_service_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_query_answerable_question_returns_grounded_citation():
    payload = {
        "query": "What is the rate limit for the payments API?",
        "product": "payments",
        "top_k": 3,
    }
    resp = client.post("/v1/query", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert not data["is_refusal"]
    assert data["groundedness_score"] >= 0.70
    assert len(data["citations"]) >= 1


def test_query_unanswerable_question_triggers_refusal():
    payload = {
        "query": "What is the quantum teleportation limit for the billing subsystem?",
        "top_k": 3,
    }
    resp = client.post("/v1/query", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_refusal"] is True
    assert "cannot" in data["answer"].lower()
    assert data["groundedness_score"] == 0.0


def test_ragas_evaluation_endpoint():
    payload = {
        "question": "What is the rate limit?",
        "answer": "The rate limit is 120 requests per minute.",
        "contexts": ["The payments API allows 120 requests per minute per API key."],
    }
    resp = client.post("/v1/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["faithfulness"] >= 0.70
    assert data["grounded"] is True
