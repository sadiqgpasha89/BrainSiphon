# Nominal & Failure Sequence Diagrams (Resilience Architecture)

**Document Code:** `BS-TMPL-DESIGN-02`  
**Phase:** Phase 1 — Architecture & Design (Step 1.2)  

---

## 1. Nominal Success Flow (End-to-End sub-15ms Scoring)

```mermaid
sequenceDiagram
  autonumber
  actor Client as Core Application / Gateway
  participant API as Inference Serving API (FastAPI)
  participant Cache as Online Feature Store (Redis)
  participant Model as ML Model Engine (ONNX/LGBM)
  participant Ledger as Decisions DB (PostgreSQL)

  Client->>+API: POST /v1/score {event_id, entity_id, payload}
  API->>API: Validate schema & JWT token (0.5ms)
  API->>+Cache: MGET entity_features:{entity_id}
  Cache-->>-API: Historical aggregate features (2.5ms)
  API->>API: Assemble feature vector & scale (0.5ms)
  API->>+Model: predict_proba(vector)
  Model-->>-API: Probability score: 0.94, top SHAP features (4.0ms)
  API->>API: Apply decision threshold (score >= 0.85 -> BLOCK) (0.2ms)
  API--)Ledger: Async write decision WAL record (fire-and-forget)
  API-->>-Client: 200 OK {decision: "BLOCK", score: 0.94, latency_ms: 7.7}
```

---

## 2. Failure Flow 1: Online Feature Store Timeout (Degradation Ladder)
When the Redis cluster experiences high latency or network partition, the service must not hang.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Core Application / Gateway
  participant API as Inference Serving API
  participant Cache as Online Feature Store (Redis)
  participant Fallback as Stateless Rule Evaluator

  Client->>+API: POST /v1/score
  API->>+Cache: MGET entity_features:{entity_id}
  Note over Cache: Redis timeout threshold = 5ms
  Cache--xAPI: Timeout / Connection Error (5.0ms)
  API->>API: Trip local circuit-breaker; log feature_store_degraded
  API->>+Fallback: Evaluate stateless transaction payload rules
  Fallback-->>-API: Heuristic disposition: "REVIEW" (cold features only)
  API-->>-Client: 200 OK {decision: "REVIEW", degraded: true, reason: "FEATURE_STORE_TIMEOUT"}
```

---

## 3. Failure Flow 2: Model Inference Execution Timeout (> 12ms Hard Deadline)
When model inference hangs due to thread pool starvation or lock contention.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Core Application / Gateway
  participant API as Inference Serving API
  participant Model as ML Model Engine
  participant Fallback as Emergency Fallback Heuristic

  Client->>+API: POST /v1/score
  API->>Model: Execute prediction task
  Note over API,Model: Hard deadline budget = 12ms
  API->>API: CancellationToken fires at 12.0ms
  API->>+Fallback: Execute static allowlist / low-risk heuristic (0.5ms)
  Fallback-->>-API: Emergency fallback disposition: "ALLOW_WITH_FLAG"
  API-->>-Client: 200 OK {decision: "ALLOW_WITH_FLAG", degraded: true, fallback_executed: true}
  API--)API: Log metric: model_timeout_shedding_count += 1
```

---

## 4. Failure Flow 3: Dead-Letter Queue (DLQ) & Event Replay Flow
When an asynchronous event consumer fails to process a poison-pill event.

```mermaid
sequenceDiagram
  autonumber
  participant Kafka as Ingestion Topic (Kafka)
  participant Consumer as Streaming Pipeline (Faust/Worker)
  participant DLQ as Dead-Letter Queue Topic
  participant S3 as Error Diagnostic Bucket

  Kafka->>+Consumer: Ingest batch [msg_1, msg_2_malformed, msg_3]
  Consumer->>Consumer: Process msg_1 -> Success
  Consumer->>Consumer: Process msg_2 -> Schema ValidationError (missing required timestamp)
  Consumer->>Consumer: Retry 3x with exponential backoff (100ms, 200ms, 400ms)
  Consumer->>+DLQ: Publish msg_2 with error headers & stacktrace
  DLQ-->>-Consumer: ACK
  Consumer->>+S3: Archive payload for offline investigation
  Consumer->>Consumer: Advance consumer offset to msg_3 (no pipeline blockage)
  Consumer->>Consumer: Process msg_3 -> Success
```

