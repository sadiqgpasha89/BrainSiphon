# Spare Parts Criticality Classification: model card and data card

> Generated from the blueprint `manufacturing/spare-parts-criticality-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spare Parts Criticality Classification · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** An ABC analysis by annual spend, because it is the common starting point.
- **Production model:** A model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk.
- **Intended use:** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level.
- **Out of scope:** - Part description length: not importance.<br>- Warehouse bin: irrelevant.<br>- Vendor name: an identifier.
- **Primary metrics:** - Agreement with engineer criticality<br>- Stock-out rate in critical class<br>- Calibration of failure likelihood
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Rarely used critical part<br>- Equipment retired<br>- Supplier exit
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level.
- **Label:** For "Spare Parts Criticality Classification": Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Classifying by spend alone.
- **Sources:** - **Source:** Equipment downtime cost inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from finance and production.<br>- **Source:** Failure rate of the part inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from work orders.<br>- **Source:** Lead time and single source inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from purchasing.<br>- **Source:** Interchangeability inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the part master.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Classifying by spend alone<br>- Ignoring substitutes<br>- No expert review
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
