# Operational Runbook RB-05: Vector Database Failure & Fallback Retrieval

**Runbook Code:** `RB-05-VECTOR-DB`  
**Severity:** `P1` (Semantic Search / RAG Failure)  
**Primary Alert:** `VectorSearchErrorRateHigh` (HTTP 5xx rate > 5% or query timeout > 800ms)  
**Target MTTR:** < 5 minutes to restore search availability  
**Accountable Roles:** Platform Engineer (Primary On-Call), AI Engineer  

---

## 1. Trigger Conditions & Detection
* **Prometheus Alert Trigger:**
  ```promql
  sum(rate(vector_search_latency_seconds_count{status="error"}[2m])) 
  / 
  sum(rate(vector_search_latency_seconds_count[2m])) > 0.05
  OR
  pgvector_circuit_breaker_state == 1  # 1 = Open
  ```
* **Symptoms:**
  - PostgreSQL / pgvector or Milvus cluster OOMs or runs out of shared memory.
  - HNSW index build blocks write transactions.
  - Hybrid search falls back to keyword-only MiniSearch.

---

## 2. Immediate Mitigation (< 5 Minutes)

### Step 1: Force Fallback to BM25 / Keyword Retrieval
Trip the circuit breaker to bypass vector indexing and route queries strictly through Postgres full-text / BM25 search:
```bash
# Force trip vector search circuit breaker
curl -X POST "http://inference-service.internal:8000/v1/admin/circuit-breaker/pgvector/trip"
```

### Step 2: Restart or Scale Vector Database Pods
```bash
kubectl rollout restart statefulset/vector-db -n brainsiphon-prod
kubectl rollout status statefulset/vector-db -n brainsiphon-prod
```

### Step 3: Evict Corrupted In-Memory HNSW Index
If the index is corrupted in PostgreSQL:
```sql
-- Rebuild index concurrently without blocking read traffic
REINDEX INDEX CONCURRENTLY idx_document_embeddings_hnsw;
```

