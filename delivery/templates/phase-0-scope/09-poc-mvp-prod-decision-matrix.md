# PoC vs MVP vs Production Scope Boundary Matrix

**Document Code:** `BS-TMPL-SCOPE-09`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.10)  

---

## 1. Scope Boundary Definition

One of the primary causes of project failure is "PoC Creep"—attempting to build full production infrastructure during a feasibility proof, or inversely, shipping an unhardened prototype into live customer traffic.

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     Proof-of-Concept (PoC)      │     │  Minimum Viable Product (MVP)   │     │        Full Production          │
├─────────────────────────────────┤     ├─────────────────────────────────┤     ├─────────────────────────────────┤
│ • Offline historical data split │     │ • Live shadow traffic connected │     │ • Active live decisioning       │
│ • Local Python / Jupyter run    │     │ • Real-time scoring microservice│     │ • Multi-AZ HA Kubernetes        │
│ • Proves statistical signal     │     │ • Feast + Redis feature store   │     │ • Canary rollout & auto-rollback│
│ • Zero customer impact          │     │ • Human reviewer approval queue │     │ • 24/7 on-call pager & runbooks │
│ • Target Timeline: 2–3 weeks    │     │ • Target Timeline: 6–8 weeks    │     │ • Target Timeline: 12–16 weeks  │
└─────────────────────────────────┘     └─────────────────────────────────┘     └─────────────────────────────────┘
```

---

## 2. Capability & Artifact Boundary Matrix

| Engineering Dimension | Proof-of-Concept (PoC) | Minimum Viable Product (MVP) | Full Production Service |
| :--- | :--- | :--- | :--- |
| **Maturity Level** | **L1 / L2 (Prototype / Eval)** | **L3 / L4 (Integ / Shadow)** | **L5 (Production-Ready)** |
| **Data Environment** | Static sample extract (Parquet/CSV) | Live Kafka topic / CDC stream | Bi-temporal Lakehouse + Feast |
| **Model Serving** | Python batch script / local test | FastAPI in Docker (P99 < 30ms) | Multi-replica HPA (P99 < 15ms) |
| **Security & Auth** | Local environment variables | API Keys / OAuth2 JWT auth | mTLS, IAM Workload Identity, Vault |
| **Decision Path** | Offline simulation only | Shadow traffic (0% live change) | 100% live traffic with canaries |
| **Observability** | Console print statements / logs | OpenTelemetry traces & Prometheus| PagerDuty alerts, Grafana dashboards|
| **Incident Runbooks** | None (ad-hoc debugging) | Core triage & rollback script | 10 reference SRE runbooks |
| **Exit Gate Requirement** | Statistically significant PR-AUC | P99 latency SLA & shadow match | 30 days zero-incident SLA hold |

---

## 3. Scope Cutoff Rules (What is EXCLUDED from MVP)
1. **Automated Online Continuous Retraining:** Excluded from MVP. MVP uses scheduled batch retrains or manual retrain triggers upon detected drift.
2. **Multi-Region Active-Active Replication:** Excluded from MVP. Multi-AZ within a single primary cloud region is sufficient.
3. **Complex Deep Learning Ensembles:** Excluded if boosted trees (LightGBM/XGBoost) reach within 2% of deep neural network accuracy with 10x lower latency.

