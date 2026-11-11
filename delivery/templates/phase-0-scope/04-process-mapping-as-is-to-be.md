# Process Mapping Template: AS-IS vs TO-BE Architecture

**Document Code:** `BS-TMPL-SCOPE-04`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.4)  

---

## 1. Process Comparison Overview

```
AS-IS (Current State: Manual / Rigid Heuristic)
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Event Received  │ ────► │ Static Rules    │ ────► │ Human Review    │ ────► │ Decision Taken  │
│ (e.g. Order Tx) │       │ (Hardcoded SQL) │       │ Queue (Backlog) │       │ (High Latency)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
  Latency: 0 ms             Latency: 200 ms           Latency: 4–24 hours       Total: 4–24 hours
  Accuracy: N/A             FPR: High (8.5%)          Throughput: 50/day/person Cost: $4.20 / case

TO-BE (Target State: AI-Augmented Real-Time Decisioning)
┌─────────────────┐       ┌─────────────────┐       ┌───────────────────┐     ┌─────────────────┐
│ Event Ingested  │ ────► │ Feature Store   │ ────► │ Low-Latency Model │ ──► │ Automated Allow │ (97% of traffic)
│ (Streaming/API) │       │ Online Redis    │       │ Serving (FastAPI) │     └─────────────────┘
└─────────────────┘       └─────────────────┘       └─────────┬─────────┘
  Latency: 2 ms             Latency: 4 ms                     │ Latency: 8 ms
                                                              ▼ Uncertain Band (3%)
                                                    ┌───────────────────┐     ┌─────────────────┐
                                                    │ Augmented Review  │ ──► │ Human Decision  │
                                                    │ Queue + SHAP Expl │     │ & Feedback Loop │
                                                    └───────────────────┘     └─────────────────┘
                                                      Review: < 45 seconds      Total P99: 14 ms
```

---

## 2. Quantitative Step-by-Step Transition Matrix

| Step # | Process Step Name | AS-IS Execution Mode | AS-IS Latency & Cost | TO-BE Target Execution Mode | TO-BE Target Latency & Cost | Responsible Party |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Ingestion & Enrichment** | Batch DB polling every 15 min | 15 min lag; high DB locks | Streaming Kafka + Redis feature store | < 5 ms; sub-second freshness | Data Engineer |
| **02** | **First-Line Triage** | 120 brittle SQL rules | 15% false positive rate | Calibrated ML scoring engine | < 0.5% false positive rate | ML Engineer |
| **03** | **Clear Approvals** | Manual click-through | $1.80 labor cost / tx | Fully automated zero-touch pass | < 10 ms; $0.0002 compute cost | Inference Service |
| **04** | **Ambiguous / High Risk** | Unstructured investigation | 12 min / case; inconsistent | Priority queue with top-5 SHAP signals | < 60 sec / case; standardized | Operations Reviewer |
| **05** | **Decision Ledger & Audit** | Scattered log files | Incomplete; 3-day audit search | Immutable Append-Only WAL ledger | 100% compliant; instant search | Platform / SRE |
| **06** | **Model Retraining Loop** | Ad-hoc manual re-run (6 mo) | High drift; metric degradation | Continuous training on reviewer labels | Automated 14-day retraining cycle| MLOps Engineer |

---

## 3. Bottleneck & Failure Analysis in Transition
1. **Upstream System Latency:** If upstream payment gateways or databases exceed 10ms, the model's 15ms budget is consumed.  
   *Mitigation:* Introduce a strict circuit-breaker with a 12ms timeout that falls back to localized heuristic scoring.
2. **Reviewer Capacity Saturation:** If the model's uncertain threshold routes > 5% of traffic to human review, analysts will face queue burnout.  
   *Mitigation:* Dynamic score threshold tuning with PID budget pacer to cap review queue intake at operational staffing limits.
3. **Data Quality Degradation:** Upstream schema changes (e.g., dropping a postal code column) break model feature extraction.  
   *Mitigation:* Implement strict schema validation and data contracts at ingestion boundaries before features enter the online store.

