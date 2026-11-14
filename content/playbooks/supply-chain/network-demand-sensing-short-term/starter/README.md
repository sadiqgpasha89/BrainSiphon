# Short-Term Supply Chain Demand Sensing — Reference Implementation

> **Looking for the whole system?** This starter covers the modelling step on synthetic data. The complete, runnable
> batch forecasting system (source system, CDC, validation, features, training, registry, serving, API with authentication,
> application, human review, monitoring, retraining) is in
> [`reference-implementations/batch-forecasting`](../../../../../reference-implementations/batch-forecasting/). Where the two differ, that one is the reference.


> **Blueprint Reference:** `supply-chain/network-demand-sensing-short-term`  
> **Forecast Horizon:** Daily 1-to-14 day multi-echelon SKU demand sensing  
> **Evaluation Metric:** WAPE $\le 18.5\%$, Bias $\in [-3\%, +3\%]$, Pinball Loss across P10/P50/P90 quantiles  
> **Maturity Level:** M4 (Evaluation-Ready Probabilistic Forecasting Prototype & API)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # Supply chain operational guide and forecasting runbook
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn)
├── make_data.py                   # Multi-echelon SKU warehouse order generator with promotion shocks
├── features.py                    # Calendar lags, lead-time rolling means, and promotional indicators
├── baseline.py                    # Seasonal Naive / Exponential Smoothing vs Quantile Gradient Boosting
├── reconciliation.py              # Hierarchical reconciliation (MinT / bottom-up across warehouse nodes)
├── serving.py                     # FastAPI serving engine returning quantile demand forecasts (P10/P50/P90)
├── test_starter.py                # Pytest validation for WAPE, Pinball Loss, and forecast hierarchy
├── test_serving.py                # Pytest integration tests for batch forecasting endpoints
├── contracts/                     # Interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification
│   ├── asyncapi.yaml              # Streaming ERP inventory event schema
│   └── data-contract.yaml         # Open Data Contract for sales orders and stock levels
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Production container build
    └── docker-compose.yml         # Local stack
```

---

## 2. Quickstart & Execution

```bash
# Setup environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Generate synthetic SKU order streams
python make_data.py

# Train baseline and evaluate WAPE and quantile loss
python baseline.py

# Run test suite
pytest -q -p no:cacheprovider

# Launch serving microservice
uvicorn serving:app --host 0.0.0.0 --port 8000
```

