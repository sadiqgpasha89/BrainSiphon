# Wafer Yield Excursion Detection: model card and data card

> Generated from the blueprint `manufacturing/wafer-yield-excursion-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wafer Yield Excursion Detection · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual commonality analysis by yield engineers with a spreadsheet, because it is the standard practice.
- **Production model:** Automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer.
- **Intended use:** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours.
- **Out of scope:** - Lot name: an identifier.<br>- Operator name: not a driver.<br>- Wafer slot number alone: weak link.
- **Primary metrics:** - Attribution accuracy on past excursions<br>- Detection delay<br>- False hold rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Several tools involved<br>- Metrology delay<br>- New product ramp
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
- **Purpose:** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours.
- **Label:** For "Wafer Yield Excursion Detection": Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Lot-level averages.
- **Sources:** - **Source:** Tool commonality score inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: needs the wafer path.<br>- **Source:** Metrology deviation inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per step.<br>- **Source:** Fault detection summary inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per tool.<br>- **Source:** Time since maintenance inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the CMMS.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Lot-level averages<br>- Single metric correlation<br>- Alarms without a tool and step
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
