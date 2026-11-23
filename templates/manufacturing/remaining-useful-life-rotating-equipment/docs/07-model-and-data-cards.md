# Remaining Useful Life Prediction for Rotating Equipment: model card and data card

> Generated from the blueprint `manufacturing/remaining-useful-life-rotating-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remaining Useful Life Prediction for Rotating Equipment · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A time-based replacement schedule from manufacturer guidance, because it is the policy the model must improve.
- **Production model:** A survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality.
- **Intended use:** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure.
- **Out of scope:** - Asset tag: an identifier.<br>- Vendor name alone: confounded with age.<br>- Technician name: not a failure cause.
- **Primary metrics:** - Error in remaining life at 14 and 30 days<br>- Calibration of intervals<br>- Early warning rate on held-out failures
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Few failures<br>- Sensor fault<br>- Repair resets the asset
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure.
- **Label:** For "Remaining Useful Life Prediction for Rotating Equipment": Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Dropping censored assets.
- **Sources:** - **Source:** Vibration band energy trend inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per asset class and speed.<br>- **Source:** Temperature rise over load inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: condition on load.<br>- **Source:** Operating hours at high load inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the historian.<br>- **Source:** Maintenance history inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the CMMS.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Dropping censored assets<br>- Using replacement date as failure<br>- Random splits across assets over time
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
