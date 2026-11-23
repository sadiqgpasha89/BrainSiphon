# Capable-to-Promise Order Promising: model card and data card

> Generated from the blueprint `manufacturing/capable-to-promise-order-promising` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Capable-to-Promise Order Promising · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** The standard lead time by product family, because it is the fallback sales use today.
- **Production model:** A promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band.
- **Intended use:** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met.
- **Out of scope:** - Sales rep name: irrelevant.<br>- Order channel alone: weak link.<br>- Quote number: an identifier.
- **Primary metrics:** - On-time rate of promises<br>- Calibration of confidence<br>- Latency at p99
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Capacity overbooked<br>- Plan change after the promise<br>- Data lag
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
- **Purpose:** Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met.
- **Label:** For "Capable-to-Promise Order Promising": Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Standard lead times.
- **Sources:** - **Source:** Available stock and planned receipts inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: live.<br>- **Source:** Capacity load by week inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the schedule.<br>- **Source:** Historical on-time rate by lane inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: by route.<br>- **Source:** Order priority class inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from sales policy.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Standard lead times<br>- Single-point promise dates<br>- No reservation locks
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
