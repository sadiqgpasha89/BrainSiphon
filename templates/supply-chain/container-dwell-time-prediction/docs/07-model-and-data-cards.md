# Container Dwell-Time Prediction: model card and data card

> Generated from the blueprint `supply-chain/container-dwell-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Dwell-Time Prediction · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Average dwell by shipping line.
- **Production model:** Discrete-time survival GBDT with customs-stage features and consignee embeddings.
- **Intended use:** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure.
- **Out of scope:** - Container colour: none.<br>- Seal number: none.
- **Primary metrics:** - Concordance index<br>- Calibration of dwell quantiles
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Customs system outage<br>- Port congestion changes truck availability
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure.
- **Label:** For "Container Dwell-Time Prediction": Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Training on completed containers only.
- **Sources:** - **Source:** Customs status stage inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event times.<br>- **Source:** Consignee dwell history inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: prior only.<br>- **Source:** Weekend and holiday gap inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on completed containers only<br>- Using clearance time as a feature before it happens
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
