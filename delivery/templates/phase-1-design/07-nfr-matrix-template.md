# Measurable Non-Functional Requirements (NFR) Matrix

**Document Code:** `BS-TMPL-DESIGN-07`  
**Phase:** Phase 1 — Architecture & Design (Step 1.3)  

---

## 1. Measurable Engineering Service Level Objectives (SLOs)

| NFR Category | Metric | Baseline Target | Stress Target | Enforcement Mechanism | Verification Tool |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Performance** | **P50 Latency** | ≤ 6.0 ms | ≤ 8.0 ms | Fast Redis MGET & ONNX inference | k6 Load Test |
| **Performance** | **P95 Latency** | ≤ 10.0 ms | ≤ 12.0 ms | Non-blocking async I/O | k6 Load Test |
| **Performance** | **P99 Latency** | ≤ 15.0 ms | ≤ 18.0 ms | 12ms circuit-breaker cancellation | k6 Stress Test |
| **Throughput** | **Sustained RPS** | 2,500 req/sec | 5,000 req/sec | Horizontal Pod Autoscaler (HPA) | k6 Soak Test |
| **Throughput** | **Burst Headroom** | 8,000 req/sec (10s) | 10,000 req/sec | Envoy adaptive concurrency shedding | k6 Spike Test |
| **Availability** | **Service SLO** | 99.95% uptime | 99.90% | Multi-AZ deployment (AZ-A, AZ-B) | Prometheus blackbox |
| **Resilience** | **Max Downtime** | MTTR ≤ 5 min | MTTR ≤ 15 min | Automated container health restart | Chaos Mesh |
| **Disaster Rec.** | **RPO (Data Loss)** | 0 seconds | 0 seconds | Synchronous DB replication & WAL | Postgres wal_level |
| **Disaster Rec.** | **RTO (Recovery)** | ≤ 15 minutes | ≤ 30 minutes | Automated Terraform multi-region plan| DR Rehearsal |
| **Data Freshness**| **Streaming Lag** | ≤ 3.0 seconds | ≤ 10.0 seconds | Consumer group lag monitoring | Kafka Exporter |
| **Security** | **Auth Verification**| ≤ 0.5 ms | ≤ 1.0 ms | Local asymmetric JWT verification | Unit test suite |
| **Cost Ceiling** | **Per 1,000 tx** | ≤ $0.0035 | ≤ $0.0050 | Capacity model CPU right-sizing | AWS Cost Explorer |

---

## 2. Hard Degradation Budgets & Degradation Ladder

```
Nominal Request (0–8 ms)
  ├─ 0.0 ms: Request Ingress & JWT Validation
  ├─ 2.0 ms: Redis Entity Feature Fetch
  ├─ 5.0 ms: Feature Vector Assembly
  ├─ 7.5 ms: ONNX Model Inference & Thresholding
  └─ 8.0 ms: Return 200 OK + Decision
  
Degradation Step 1: Redis Slow (> 5 ms)
  └─ Cancel Redis fetch; proceed with client-supplied transaction features only; tag "DEGRADED_PARTIAL_FEATURES"
  
Degradation Step 2: Model Inference Slow (> 12 ms)
  └─ CancellationToken fires; execute localized static whitelist/blacklist rules; return fallback disposition
```

