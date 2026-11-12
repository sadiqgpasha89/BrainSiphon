# Session-Based Next-Item Recommendation — Reference Implementation

> **Blueprint Reference:** `retail/session-based-next-item-recommendation`  
> **Target SLA:** P99 Latency $< 25\text{ ms}$, Throughput $\ge 5,000\text{ req/sec}$  
> **Evaluation Metric:** Hit Rate @ 10 $\ge 35\%$, MRR @ 10 $\ge 0.18$, Diversity Score $\ge 0.72$  
> **Maturity Level:** M4 (Evaluation-Ready Recommendation Prototype & Serving API)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # Operational runbook and architecture specification
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn)
├── make_data.py                   # Anonymous user session generator with dwell times & item catalog
├── baseline.py                    # Most-Popular vs Co-occurrence Graph vs Two-Stage Neural Re-ranker
├── reranker.py                    # Category diversity filtering & real-time inventory thresholding
├── serving.py                     # High-throughput FastAPI recommendation microservice
├── test_starter.py                # Pytest evaluation suite for recommendation hit rates & MRR
├── test_serving.py                # Pytest API integration tests for recommendation endpoints
├── contracts/                     # Interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification
│   ├── asyncapi.yaml              # Streaming clickstream event schema (Kafka)
│   └── data-contract.yaml         # Open Data Contract for user clickstream
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Production serving container build
    └── docker-compose.yml         # Local stack (Serving API + Redis item embedding cache)
```

---

## 2. Quickstart & Execution

```bash
# Setup environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Generate synthetic session clickstreams
python make_data.py

# Train baseline and evaluate Hit Rate @ 10 & MRR @ 10
python baseline.py

# Run test suite
pytest -q -p no:cacheprovider

# Launch serving microservice
uvicorn serving:app --host 0.0.0.0 --port 8000
```

### Sample Prediction Invocation
```bash
curl -X POST http://localhost:8000/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_99182",
    "recent_item_ids": [1042, 1089, 3301],
    "k": 5
  }'
```

