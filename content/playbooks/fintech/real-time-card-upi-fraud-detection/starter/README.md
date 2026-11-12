# Real-Time Card & UPI Fraud Detection — Reference Implementation

> **Blueprint Reference:** `fintech/real-time-card-upi-fraud-detection`  
> **Target SLA:** P99 Latency $< 15\text{ ms}$, Throughput $\ge 2,500\text{ req/sec}$  
> **Decision Vocabulary:** `ALLOW` | `STEP_UP` | `BLOCK`  
> **Maturity Level:** M4 (Evaluation-Ready Prototype & Executable Serving Microservice)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # This comprehensive runbook
├── requirements.txt               # Pinned dependencies (numpy, pandas, scikit-learn, fastapi, uvicorn)
├── make_data.py                   # Point-in-time synthetic transaction & fraud generator with label maturity
├── features.py                    # Real-time feature engineering: velocity counters & risk ratios
├── baseline.py                    # Chronological walk-forward model training & PR-AUC evaluation
├── serving.py                     # High-concurrency FastAPI microservice with circuit breaker & fallback
├── ledger.py                      # Write-Ahead-Log (WAL) audit ledger for tamper-evident decision storage
├── test_starter.py                # Pytest validation suite for data generation & modeling
├── test_serving.py                # Pytest integration tests for FastAPI endpoints & latency SLAs
├── contracts/                     # Machine-readable interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification
│   ├── asyncapi.yaml              # AsyncAPI 3.0 streaming event contract (Kafka)
│   └── data-contract.yaml         # Open Data Contract for transaction schemas
└── deployment/                    # Containerization & orchestration manifests
    ├── Dockerfile                 # Multi-stage production container build
    └── docker-compose.yml         # Local stack (Serving API + Redis feature store cache)
```

---

## 2. Prerequisites & Environment Setup

- **Python:** Version $\ge 3.10$ (3.11 or 3.12 recommended).
- **Docker & Docker Compose:** Required for running the local serving stack with Redis.
- **Hardware:** $\ge 2\text{ vCPU}$, $4\text{ GB RAM}$.

### Environment Variables
Configure the following environment variables (or rely on sensible defaults):

```bash
export ENVIRONMENT="development"            # development | staging | production
export SERVICE_PORT=8000                     # HTTP port for FastAPI serving
export REDIS_HOST="localhost"               # Redis feature store host
export REDIS_PORT=6379                       # Redis port
export MODEL_FLAVOR="challenger_gbdt"       # baseline_logistic | challenger_gbdt
export FALLBACK_MODE="heuristic_rules"      # Behavior when feature fetch times out
export LOG_LEVEL="INFO"
```

---

## 3. Step-by-Step Execution Guide

### Step 1: Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Generate Synthetic Data & Verify Feature Pipelines
```bash
# Generate 90-day synthetic card and UPI transactions with realistic label delays
python make_data.py --rail card --samples 50000 --output transactions.parquet
```

### Step 3: Train & Benchmark Baseline vs Challenger Models
```bash
# Execute chronological evaluation on matured labels (45-day train, 14-day val, 21-day test gap)
python baseline.py card
```
*Expected Output:*
```json
{
  "rail": "card",
  "baseline_pr_auc": 0.442,
  "challenger_pr_auc": 0.698,
  "recall_at_0.5_fpr": 0.836,
  "false_decline_rate": 0.0028,
  "acceptance_gate": "PASSED"
}
```

### Step 4: Run the Complete Automated Test Suite
```bash
# Execute Pytest test suites (modeling, data constraints, and serving SLAs)
pytest -q -p no:cacheprovider
```

### Step 5: Launch the Low-Latency Serving Microservice
```bash
# Start FastAPI service with Uvicorn worker
uvicorn serving:app --host 0.0.0.0 --port 8000 --workers 2
```

### Step 6: Invoke Endpoint & Verify Prediction
```bash
curl -X POST http://localhost:8000/v1/score \
  -H "Content-Type: application/json" \
  -d '{
    "txn_id": "txn_test_99812",
    "card_id": 40128812,
    "amount": 250.00,
    "merchant_id": 7712,
    "device_id": 9812301,
    "rail": "card"
  }'
```
*Expected Response (`200 OK` in $< 15\text{ ms}$):*
```json
{
  "txn_id": "txn_test_99812",
  "decision": "ALLOW",
  "p_fraud": 0.0124,
  "latency_ms": 4.8,
  "decision_reason": "Low risk velocity, trusted merchant category",
  "model_version": "challenger-v1.0.0",
  "fallback_applied": false
}
```

---

## 4. Local Containerized Stack (Docker Compose)

To spin up the entire serving stack including the Redis feature store cache:

```bash
# Launch containers in background
docker compose -f deployment/docker-compose.yml up -d

# Verify container health
curl -s http://localhost:8000/healthz

# Teardown stack
docker compose -f deployment/docker-compose.yml down -v
```

---

## 5. Prototype-to-Production Roadmap (M0–M6)

| Milestone | Scope in this Starter | Production Requirement |
|---|---|---|
| **M0: Discovery** | Business problem & 3-action vocabulary defined | Signed BRD & Stakeholder charter (`BS-TMPL-SCOPE-02`) |
| **M1: Data Acquisition** | Synthetic transaction generator with label delay (`make_data.py`) | Production Kafka/Debezium CDC streaming integration |
| **M2: Feature Engineering** | Sliding window aggregations (`features.py`) | Feast / Redis cluster with point-in-time offline backfill |
| **M3: Model Training** | HistGradientBoosting challenger (`baseline.py`) | Distributed LightGBM training on GPU cluster with MLflow |
| **M4: Serving Prototype** | Fully runnable FastAPI microservice (`serving.py`) | GKE / EKS deployment with multi-AZ HPA autoscaling |
| **M5: Integration** | Local SQLite WAL audit ledger (`ledger.py`) | Cloud KMS-encrypted WORM storage & real-time Kafka event publishing |
| **M6: Operations** | Prometheus `/metrics` exporter | 24/7 Datadog alerts, automated canary deployment, SRE Runbook |

---

## 6. Troubleshooting & Diagnostics

- **Issue: High Latency ($> 15\text{ ms}$):**
  - Verify Redis is running locally and reachable via `redis-cli ping`.
  - Check if feature calculation is falling back to cold disk storage.
- **Issue: Model Predictions Default to Fallback:**
  - Verify `FALLBACK_MODE` setting in environment variables.
  - Review `ledger.py` audit logs for unhandled input validation errors.

