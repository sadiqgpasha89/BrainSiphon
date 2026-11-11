# Requirements Traceability Matrix (RTM)

**Document Code:** `BS-TMPL-SCOPE-05`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.6)  

---

## 1. Traceability Architecture: Business Goal to Production Verification

Every production AI system must maintain an unbroken chain of custody from the executive sponsor's business objective down to the individual integration test:

```
Business Objective (BO)
        │
        ▼
Business Requirement (BR)
        │
        ▼
System Architecture / ML Objective (ML-OBJ / NFR)
        │
        ▼
Technical Implementation Artifact (Code / Contract / IaC)
        │
        ▼
Verification Suite & Test Case (Test / Runbook)
```

---

## 2. Standard Traceability Matrix

| Req ID | Business Requirement (BR) | ML / System Specification | Implementation Artifact | Verification Test Case | Owner | Sign-off Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RTM-01** | Reduce net chargeback fraud losses below 10 basis points | Binary classification with PR-AUC ≥ 0.85; Recall @ 0.3% FPR ≥ 88% | `content/playbooks/fintech/.../starter/src/models/` | `tests/model_evaluation/test_pr_auc_split.py` | Lead Data Scientist | Gate 3 (Build) |
| **RTM-02** | Zero customer transaction timeout or drop at payment gateway | P99 serving latency ≤ 15ms at 5,000 req/sec; 12ms circuit breaker | `starter/src/serving/service.py` (FastAPI) | `tests/performance/k6_latency_stress.js` | Inference Engineer | Gate 4 (Verify) |
| **RTM-03** | Ensure complete compliance with GDPR Right to Explanation | Return top-5 SHAP feature contributions for every scored decision | `starter/src/domain/explainability.py` (TreeSHAP) | `tests/unit/test_shap_attribution.py` | AI Engineer | Gate 3 (Build) |
| **RTM-04** | Prevent silent feature skew between training and inference | Point-in-time ASOF feature joins; unified Feast feature definitions | `starter/src/data/feature_store.py` (Feast + Redis) | `tests/data_quality/test_feature_parity.py` | Data Engineer | Gate 2 (Data) |
| **RTM-05** | Provide uninterrupted service during cloud zone failure | Active-active multi-AZ Kubernetes deployment; RTO < 60s, RPO = 0s | `deployment/terraform/modules/compute-k8s/` | `tests/resilience/chaos_az_partition.py` | Platform Engineer | Gate 4 (Verify) |
| **RTM-06** | Immediate mitigation of unexpected model accuracy drift | Automated drift detector (PSI > 0.15) triggering rollback to challenger | `deployment/runbooks/RB-01-model-degradation.md` | `tests/integration/test_automated_rollback.py` | MLOps Engineer | Gate 5 (Release) |
| **RTM-07** | Regulatory auditability of automated decisions for 7 years | Append-only write-ahead log (WAL) decision ledger in PostgreSQL | `starter/src/integrations/db_ledger.py` (Alembic) | `tests/integration/test_immutable_ledger.py` | Solution Architect | Gate 5 (Release) |

