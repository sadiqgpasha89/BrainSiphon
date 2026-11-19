# SKU-Store Demand Forecasting: model card and data card

> Generated from the blueprint `retail/demand-forecasting-sku-store` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SKU-Store Demand Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Seasonal naive plus promo uplift factors.
- **Production model:** Global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs.
- **Intended use:** Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness.
- **Out of scope:** - SKU description text: adds nothing over category and attributes.<br>- Day-of-month dummies: spurious for most items.
- **Primary metrics:** - WAPE and weighted pinball loss<br>- Bias at SKU-store level
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Stock-out days recorded as zero demand<br>- New store opening
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness.
- **Label:** For "SKU-Store Demand Forecasting": Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Random CV over time.
- **Sources:** - **Source:** Promo calendar flag with depth inputs<br>**Owner:** Merchandise planning<br>**System Of Record:** Product information management (SKU and hierarchy master)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: only plans known at forecast origin.<br>- **Source:** Price index inputs<br>**Owner:** Supply-chain IT<br>**System Of Record:** Inventory management and warehouse management (stock and availability)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: future prices must be planned values.<br>- **Source:** Lag-7 and lag-364 demand inputs<br>**Owner:** Master data team<br>**System Of Record:** POS transaction history<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: alignment by retail calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random CV over time<br>- Future promo plans used before they were decided
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
