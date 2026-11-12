# Blameless Post-Incident Review (PIR) Template

> **Incident ID:** `INC-[YYYYMMDD]-[SEV]`  
> **Severity:** `[SEV-1 / SEV-2 / SEV-3]`  
> **Incident Date:** `[YYYY-MM-DD]`  
> **Service Impacted:** `[System Name / Blueprint ID]`  
> **Incident Commander:** `[Name]`  
> **Lead SRE Investigator:** `[Name]`  
> **PIR Meeting Date:** `[YYYY-MM-DD]`

---

## 1. Executive Summary & Impact Summary

| Metric | Recorded Value | Target SLO |
|---|---|---|
| **Incident Duration (T_detect to T_resolve)** | `[e.g. 42 minutes]` | $< 30\text{ minutes}$ |
| **Time to Detect (TTD)** | `[e.g. 4 minutes]` | $< 5\text{ minutes}$ |
| **Time to Acknowledge (TTA)** | `[e.g. 2 minutes]` | $< 5\text{ minutes}$ |
| **Time to Mitigate (TTM)** | `[e.g. 18 minutes]` | $< 20\text{ minutes}$ |
| **Transactions Affected** | `[e.g. 14,280 requests]` | $0$ |
| **Degraded Mode / Fallback Used** | `[Heuristic Rule Fallback]` | Permitted under SLA |
| **Customer / Revenue Impact** | `[e.g. $12,400 delayed settlement]` | $\$0$ |
| **SLO Error Budget Consumed** | `[e.g. 14.2% of monthly budget]` | $< 10\%$ per incident |

---

## 2. Chronological Timeline (UTC)

- **14:02 UTC - T0 (Event Occurred):** Upstream Kafka producer changed event timestamp formatting from epoch milliseconds to ISO-8601 string during a minor patch.
- **14:06 UTC - T1 (Detection):** Feature ingestion consumer began failing with `ValueError: Invalid timestamp format`. Datadog alert `[CRITICAL] Ingestion Pipeline DLQ Spike` triggered.
- **14:08 UTC - T2 (Acknowledgment):** On-call SRE acknowledged PagerDuty alert and initiated Incident Bridge.
- **14:14 UTC - T3 (Triage):** Incident Commander identified feature store freshness lag reaching 8 minutes, causing serving pods to default to fallback rules.
- **14:20 UTC - T4 (Mitigation):** SRE deployed hotfix to streaming consumer parser to support both ISO-8601 and epoch timestamps simultaneously.
- **14:26 UTC - T5 (Consumer Re-sync):** Streaming consumer caught up with Kafka lag; feature store freshness returned to $< 500\text{ ms}$.
- **14:44 UTC - T6 (Resolution & All-Clear):** Serving pods resumed primary model inference with zero fallback invocations. Incident closed.

---

## 3. Root Cause Analysis (The 5 Whys)

1. **Why did serving pods switch to fallback rules?**  
   Because the online feature store entries were older than the 5-minute freshness TTL.
2. **Why was the feature store stale?**  
   Because the Flink streaming consumer threw unhandled exceptions and stalled ingestion.
3. **Why did the streaming consumer throw exceptions?**  
   Because an incoming timestamp field had switched format from integer unix millis to an ISO-8601 string.
4. **Why did the format change without warning?**  
   The upstream billing service deployed a minor version update that modified their serialization library without adhering to the schema registry contract.
5. **Why did CI/CD not catch the incompatibility?**  
   The upstream service's contract tests did not run consumer-driven contract verification against the downstream schema registry before production deployment.

---

## 4. Contributing Factors & Trigger Mechanisms

- **Process Gap:** Upstream service bypassed contract testing verification step during a hotfix deploy.
- **Resilience Positive:** The downstream inference service gracefully fell back to rule-based evaluation, preventing total transaction failure or dropped checkout requests.
- **Observability Gap:** The alert fired on DLQ message count rather than on timestamp parsing failures specifically.

---

## 5. Corrective & Preventative Actions (CAPA)

| Action Item ID | Description | Type | Owner | Target Date | Jira Ticket |
|---|---|---|---|---|---|
| **CAPA-01** | Implement strict schema registry enforcement with backward-compatibility checks in upstream CI pipeline. | Preventative | Data Platform Lead | 2026-11-20 | `INFRA-4891` |
| **CAPA-02** | Add multi-format tolerant timestamp parser into shared ingestion SDK. | Corrective | Data Engineer | 2026-11-15 | `DATA-2210` |
| **CAPA-03** | Create synthetic canary event injector to validate streaming schema end-to-end every 60 seconds. | Detective | ML Platform SRE | 2026-11-25 | `MLOPS-1142` |
| **CAPA-04** | Update SRE Runbook with fast-action schema bypass DLQ script. | Operational | SRE Lead | 2026-11-14 | `DOCS-802` |

---

## 6. Sign-Off & Lessons Learned

- **Engineering Lead:** `___________________________` Date: `__________`  
- **SRE Operations Head:** `___________________________` Date: `__________`  
- **Product Owner:** `___________________________` Date: `__________`

