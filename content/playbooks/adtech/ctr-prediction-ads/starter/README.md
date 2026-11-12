# Real-Time Ad Click-Through Rate (CTR) Prediction — Reference Implementation

> **Blueprint Reference:** `adtech/ctr-prediction-ads`  
> **Target SLA:** P99 Latency $< 10\text{ ms}$, Throughput $\ge 20,000\text{ req/sec}$  
> **Evaluation Metric:** LogLoss reduction $\ge 2.5\%$, Normalized Entropy (NE) $\le 0.88$, Calibrated Brier Score  
> **Maturity Level:** M4 (Evaluation-Ready High-Throughput Serving Prototype)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # Operational guide and ad auction serving specification
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn)
├── make_data.py                   # High-cardinality ad auction event generator (users, placements, campaigns)
├── features.py                    # Cross-feature interactions, target encoding, and frequency counters
├── baseline.py                    # Calibrated Logistic Regression vs Factorization Machine / GBDT challenger
├── serving.py                     # Ultra-low-latency FastAPI serving engine with batch scoring
├── test_starter.py                # Pytest validation for LogLoss, AUC, and calibration error
├── test_serving.py                # Pytest integration tests for real-time auction latency SLAs
├── contracts/                     # Interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification
│   ├── asyncapi.yaml              # Streaming bid request / impression event schema
│   └── data-contract.yaml         # Open Data Contract for ad impressions & click feedback
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Production serving container build
    └── docker-compose.yml         # Local stack (Serving API + Redis key-value store)
```

---

## 2. Quickstart & Execution

```bash
# Setup environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Generate synthetic ad auction log data
python make_data.py

# Train baseline and evaluate LogLoss & Calibration
python baseline.py

# Run test suite
pytest -q -p no:cacheprovider

# Launch serving microservice
uvicorn serving:app --host 0.0.0.0 --port 8000
```

