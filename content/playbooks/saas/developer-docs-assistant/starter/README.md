# Developer Docs Assistant (Production RAG) — Reference Implementation

> **Blueprint Reference:** `saas/developer-docs-assistant`  
> **Pattern Classification:** Production Retrieval-Augmented Generation (RAG) with Citation Verification  
> **Evaluation Metric:** Faithfulness $\ge 0.92$, Answer Relevance $\ge 0.88$, Context Precision $\ge 0.85$ (Ragas framework)  
> **Latency SLA:** P99 Time to First Token (TTFT) $< 800\text{ ms}$, Total Response $< 2.5\text{ s}$  
> **Maturity Level:** M4 (Evaluation-Ready RAG Prototype & SSE Streaming API)

---

## 1. Repository Layout & Architecture

```
starter/
├── README.md                      # Operational guide and RAG architecture specification
├── requirements.txt               # Dependencies (pandas, scikit-learn, fastapi, uvicorn, pydantic)
├── make_data.py                   # Technical documentation corpus generator with Markdown headings & code snippets
├── rag.py                         # Dense vector retrieval, cross-encoder re-ranking, and citation verification
├── baseline.py                    # Naive BM25 retrieval vs Hybrid Dense+Sparse with RRF (Reciprocal Rank Fusion)
├── serving.py                     # FastAPI serving engine with Server-Sent Events (SSE) token streaming
├── test_starter.py                # Pytest validation for context precision, recall, and hallucination bounds
├── test_serving.py                # Pytest integration tests for query endpoints and streaming responses
├── contracts/                     # Interface specifications
│   ├── openapi.yaml               # OpenAPI 3.1 REST API specification (supporting SSE streams)
│   ├── asyncapi.yaml              # Documentation ingestion & embedding refresh event schema
│   └── data-contract.yaml         # Open Data Contract for documentation chunks and embeddings
└── deployment/                    # Containerization assets
    ├── Dockerfile                 # Production container build
    └── docker-compose.yml         # Local stack (Serving API + Qdrant/pgvector store)
```

---

## 2. Quickstart & Execution

```bash
# Setup environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Ingest and chunk documentation corpus
python make_data.py

# Benchmark retrieval recall and citation precision
python baseline.py

# Run test suite
pytest -q -p no:cacheprovider

# Launch serving microservice with streaming support
uvicorn serving:app --host 0.0.0.0 --port 8000
```

### Sample Streaming Invocation (Server-Sent Events)
```bash
curl -N -X POST http://localhost:8000/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I configure mTLS authentication in the API gateway?",
    "stream": true
  }'
```

