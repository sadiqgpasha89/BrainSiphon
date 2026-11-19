"""Tests for the Student Knowledge Tracing FastAPI microservice."""

import pytest
from fastapi.testclient import TestClient

from serving import app

client = TestClient(app)


def test_kt_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_knowledge_tracing_interaction_updates_mastery():
    # Initial interaction with correct answer increases mastery
    payload1 = {
        "student_id": "stu_alice_01",
        "question_id": 101,
        "skill_id": 5,
        "correct": 1,
    }
    r1 = client.post("/v1/trace", json=payload1)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["total_attempts"] == 1
    assert d1["mastery_probability"] > 0.20

    # Several consecutive correct answers trigger mastery
    for q in range(102, 107):
        r_step = client.post("/v1/trace", json={
            "student_id": "stu_alice_01",
            "question_id": q,
            "skill_id": 5,
            "correct": 1,
        })
    d_final = r_step.json()
    assert d_final["is_mastered"] is True
    assert d_final["recommended_action"] == "advance_difficulty"


def test_predict_success_and_zpd():
    payload = {
        "student_id": "stu_bob_02",
        "skill_id": 2,
        "question_difficulty": 0.0,
    }
    resp = client.post("/v1/predict_success", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 < data["p_correct"] < 1.0
    assert len(data["confidence_interval"]) == 2

