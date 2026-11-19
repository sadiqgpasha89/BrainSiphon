# Shipment ETA Prediction: model card and data card

> Generated from the blueprint `supply-chain/eta-prediction-for-shipments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shipment ETA Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Planned transit time lookup by lane.
- **Production model:** Leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment.
- **Intended use:** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit.
- **Out of scope:** - Shipper name: none.<br>- Parcel colour: none.
- **Primary metrics:** - Pinball loss and interval coverage<br>- MAE of P50 ETA in hours
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - GPS gaps in tunnels or warehouses<br>- Peak season hub overload
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit.
- **Label:** For "Shipment ETA Prediction": Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Evaluating only on delivered shipments.
- **Sources:** - **Source:** Hub dwell-time distribution inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** Transportation management system (TMS)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: window before prediction.<br>- **Source:** Remaining-leg progress inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse management system (WMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: GPS timestamp alignment.<br>- **Source:** Weather and disruption on route inputs<br>**Owner:** Master data team<br>**System Of Record:** ERP (orders and shipments)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: known at prediction time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating only on delivered shipments<br>- Using the final scan in training features
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
