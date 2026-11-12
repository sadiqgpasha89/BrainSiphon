# Clinical Sepsis Early-Warning Service — Reference Implementation

> **Blueprint Reference:** `healthcare/sepsis-early-warning`  
> **Risk Classification:** High-Risk Clinical Decision Support (FDA SaMD / EU MDR Class IIa)  
> **Clinical Objective:** $\ge 4\text{ hours}$ lead-time detection prior to septic shock onset  
> **Operational Constraint:** Alert fatigue budget $\le 10\text{ alerts per 100 patient-days}$ with 12h refractory hysteresis  
> **Maturity Level:** M4 (Evaluation-Ready Clinical Prototype & FHIR v4 Integration Service)

---

## 1. Architecture & Repository Structure

```
starter/
├── README.md                      # Clinical implementation guide and runbook
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn, pydantic)
├── fhir_adapter.py                # HL7 FHIR v4 Observation & Encounter adapter with standard LOINC codes
├── make_data.py                   # Physiological patient time-series generator with sepsis trajectory
├── features.py                    # MEWS/SOFA-like feature calculations & rolling vital sign statistics
├── baseline.py                    # Patient-stratified split, lead-time evaluation, and alert budget audit
├── serving.py                     # High-availability FastAPI clinical microservice with review queue
├── test_starter.py                # Pytest validation for physiological integrity & alert policies
├── test_serving.py                # Pytest integration tests for FHIR payload parsing & API contracts
├── contracts/                     # Clinical interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST specification with clinician review workflow
│   ├── asyncapi.yaml              # Streaming vitals event schema (Bedside telemetry)
│   └── data-contract.yaml         # Clinical data contract for vital signs & lab observations
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Hardened, non-root clinical service container
    └── docker-compose.yml         # Local clinical test harness
```

---

## 2. Clinical Standards & FHIR v4 Mappings

The service natively parses HL7 FHIR v4 Observation resources mapped to standard LOINC codes:
- `8867-4`: Heart rate (beats/min)
- `8480-6`: Systolic blood pressure (mmHg)
- `9279-1`: Respiratory rate (breaths/min)
- `8310-5`: Core body temperature (Celsius)
- `2708-6`: Oxygen saturation / $SpO_2$ (%)
- `2524-7`: Blood lactate (mmol/L)

---

## 3. Step-by-Step Execution Guide

### Step 1: Initialize Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Generate Physiological Cohort Data
```bash
# Generate synthetic patient stays with physiological drift and onset curves
python make_data.py
```

### Step 3: Train & Benchmark Early-Warning Models
```bash
# Evaluate sensitivity, lead time, and alert fatigue at fixed refractory windows
python baseline.py
```
*Expected Output:*
```json
{
  "heuristic_mews_sensitivity": 0.542,
  "ml_challenger_sensitivity": 0.814,
  "median_lead_time_hours": 5.8,
  "alerts_per_100_patient_days": 8.9,
  "alert_fatigue_budget": "COMPLIANT (< 10/100 PD)"
}
```

### Step 4: Run Automated Verification Suite
```bash
pytest -q -p no:cacheprovider
```

### Step 5: Start the Clinical Serving Service
```bash
uvicorn serving:app --host 0.0.0.0 --port 8000 --workers 2
```

### Step 6: Test FHIR Telemetry Ingestion
```bash
curl -X POST http://localhost:8000/v1/score \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PT-ICU-8819",
    "encounter_id": "ENC-2026-09",
    "hour_of_stay": 14,
    "hr": 118.0,
    "sbp": 88.0,
    "rr": 26.0,
    "temp": 38.9,
    "spo2": 91.0,
    "lactate": 3.4
  }'
```
*Expected Clinical Response:*
```json
{
  "alert_id": "ALT-PT-ICU-8819-...",
  "patient_id": "PT-ICU-8819",
  "alert_tier": "CRITICAL",
  "sofa_score": 5.2,
  "suppressed_by_hysteresis": false,
  "recommended_actions": [
    "Immediate bedside nurse evaluation",
    "Initiate blood cultures & broad-spectrum IV antibiotics",
    "Draw follow-up repeat lactate within 2 hours"
  ]
}
```

---

## 4. Clinician-in-the-Loop Workflow

Critical alerts are routed directly to the clinician review queue:
```bash
# Submit clinician disposition (CONFIRMED_SEPSIS, FALSE_POSITIVE, PENDING_LABS)
curl -X POST http://localhost:8000/v1/alerts/ALT-PT-ICU-8819-14/disposition \
  -H "Content-Type: application/json" \
  -d '{
    "clinician_id": "DR-CHEN-441",
    "status": "CONFIRMED_SEPSIS",
    "notes": "Patient hypotensive and febrile. Started IV fluids and sepsis bundle protocol."
  }'
```

---

## 5. Regulatory & Clinical Risk Notice

> [!CAUTION]
> **High-Risk Regulated Software (SaMD):** This reference implementation is an engineering baseline. Deploying this software into patient care environments requires formal clinical trials, multi-center retrospective validation, institutional IRB approval, and regulatory conformity assessment under FDA 510(k) / De Novo or EU MDR Annex IX.

