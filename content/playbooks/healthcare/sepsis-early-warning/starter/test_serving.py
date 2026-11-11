"""Tests for the Clinical Sepsis Early Warning serving API, hysteresis filter, and FHIR adapter."""

import pytest
from fastapi.testclient import TestClient

from fhir_adapter import parse_fhir_bundle, parse_fhir_observation
from serving import app

client = TestClient(app)


def test_clinical_health():
    resp = client.get("/health/liveness")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_normal_vitals_yield_low_risk():
    payload = {
        "patient_id": "pt_normal_001",
        "encounter_id": "enc_101",
        "hour_of_stay": 4,
        "hr": 74.0,
        "sbp": 120.0,
        "rr": 14.0,
        "temp": 36.8,
        "spo2": 98.0,
        "lactate": 1.1,
    }
    resp = client.post("/v1/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["alert_tier"] == "LOW"
    assert data["risk_score"] < 0.20
    assert not data["hysteresis_suppressed"]


def test_severe_vitals_trigger_critical_alert():
    payload = {
        "patient_id": "pt_sepsis_002",
        "encounter_id": "enc_102",
        "hour_of_stay": 12,
        "hr": 128.0,      # Tachycardia
        "sbp": 78.0,       # Hypotension
        "rr": 28.0,        # Tachypnea
        "temp": 39.2,      # Fever
        "spo2": 91.0,
        "lactate": 4.5,    # Severe lactic acidosis
    }
    resp = client.post("/v1/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["alert_tier"] == "CRITICAL"
    assert data["risk_score"] >= 0.50
    assert len(data["recommended_actions"]) >= 2
    assert any("blood culture" in a.lower() for a in data["recommended_actions"])


def test_hysteresis_suppresses_rapid_duplicate_alerts():
    payload = {
        "patient_id": "pt_repeat_003",
        "encounter_id": "enc_103",
        "hour_of_stay": 10,
        "hr": 105.0,
        "sbp": 88.0,
        "rr": 24.0,
        "temp": 38.5,
        "spo2": 93.0,
    }
    # First alert should trigger
    r1 = client.post("/v1/predict", json=payload)
    assert r1.status_code == 200
    assert not r1.json()["hysteresis_suppressed"]

    # Immediate second alert for same patient with similar score should be suppressed
    r2 = client.post("/v1/predict", json=payload)
    assert r2.status_code == 200
    assert r2.json()["hysteresis_suppressed"] is True


def test_fhir_observation_and_bundle_parser():
    bundle = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4"}]},
                    "valueQuantity": {"value": 88.0, "unit": "beats/minute"},
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6"}]},
                    "valueQuantity": {"value": 115.0, "unit": "mmHg"},
                }
            },
        ],
    }
    vitals = parse_fhir_bundle(bundle)
    assert vitals.get("hr") == 88.0
    assert vitals.get("sbp") == 115.0


def test_clinician_review_workflow():
    payload = {
        "alert_id": "alert_99a8b",
        "clinician_id": "dr_smith_md",
        "status": "CONFIRMED_SEPSIS",
        "notes": "Initiated resuscitation bundle and drew blood cultures.",
    }
    resp = client.post("/v1/review", json=payload)
    assert resp.status_code == 200
    assert resp.json()["acknowledged"] is True

