# Knowledge Tracing & Student Mastery Modeling — Reference Implementation

> **Blueprint Reference:** `edtech/knowledge-tracing-student-modeling`  
> **Target SLA:** P99 Latency $< 30\text{ ms}$  
> **Evaluation Metric:** BKT / DKT AUC $\ge 0.78$, Brier Score $\le 0.16$  
> **Maturity Level:** M4 (Evaluation-Ready Student Modeling Prototype & API)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # Operational guide and model architecture documentation
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn)
├── make_data.py                   # Synthetic student interaction generator with skill mastery state transitions
├── features.py                    # Exponential decay recency, streak counters, and skill difficulty features
├── baseline.py                    # Bayesian Knowledge Tracing (BKT) baseline vs Deep Knowledge Tracing challenger
├── serving.py                     # FastAPI serving engine returning mastery probabilities and next questions
├── test_starter.py                # Pytest evaluation suite for mastery tracking and AUC metrics
├── test_serving.py                # Pytest API integration tests for question assessment & mastery updates
├── contracts/                     # Interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification
│   ├── asyncapi.yaml              # Streaming assessment event schema
│   └── data-contract.yaml         # Open Data Contract for student responses
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Production serving container build
    └── docker-compose.yml         # Local stack
```

---

## 2. Quickstart & Execution

```bash
# Setup environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Generate student practice sequence data
python make_data.py

# Train baseline and evaluate student mastery prediction
python baseline.py

# Run test suite
pytest -q -p no:cacheprovider

# Launch serving microservice
uvicorn serving:app --host 0.0.0.0 --port 8000
```

