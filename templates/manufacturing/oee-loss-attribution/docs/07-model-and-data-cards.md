# OEE Loss Attribution: model card and data card

> Generated from the blueprint `manufacturing/oee-loss-attribution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** OEE Loss Attribution · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A manual OEE calculation from operator logs and counts, because it is the standard practice.
- **Production model:** Automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost.
- **Intended use:** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets.
- **Out of scope:** - Operator name: not a cause.<br>- Shift label alone: confounded.<br>- Machine age: weak link.
- **Primary metrics:** - Reconciliation of lost time<br>- Classification accuracy against audits<br>- Unexplained loss share
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Micro-stops<br>- Product mix change<br>- Missing states
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets.
- **Label:** For "OEE Loss Attribution": Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Operator-logged stops only.
- **Sources:** - **Source:** Stop duration and frequency inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from machine states.<br>- **Source:** Speed versus ideal inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: ideal rate from engineering.<br>- **Source:** Reject count by cause inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from inspection.<br>- **Source:** Changeover duration inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from schedules.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Operator-logged stops only<br>- Local definitions<br>- Reporting a percentage without a Pareto
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
