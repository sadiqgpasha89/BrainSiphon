# Short-Term Demand Sensing: model card and data card

> Generated from the blueprint `supply-chain/network-demand-sensing-short-term` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Demand Sensing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Statistical baseline forecast with a seasonal factor.
- **Production model:** Gradient-boosted sensing model on recent signals with quantile outputs, reconciled to the demand plan via MinT.
- **Intended use:** Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.
- **Out of scope:** - Use year-over-year growth rate or category growth: they are too slow to matter inside 14 days and are already in the level of the series.<br>- Use the planner identifier as a feature: it carries no demand information and only records who last edited a plan.<br>- Reuse the monthly statistical forecast for the short horizon: it ignores this week's signals, which are the whole point.<br>- Report accuracy at aggregate level only: errors cancel and the figure bears no relation to what a planner sees at the product-location level.
- **Primary metrics:** - Weighted MAPE at 1-14 day horizons<br>- Forecast value added vs baseline
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - POS feed arrives late for a region<br>- Sudden supplier allocation limits shipments<br>- Promotion planned but cancelled late<br>- A new SKU with under four weeks of history
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.
- **Label:** The target is units sold on day t+h for h of 1, 3, 7 and 14, divided by the series' 28-day average at the forecast origin t so one model serves every series. Days where allocation limits capped sales are excluded from training and scoring, because sales on those days are not demand.
- **Sources:** - **Source:** Open order book inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: take the snapshot as it stood at forecast time.<br>- **Source:** Sell-through momentum inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: align calendar days across the two windows.<br>- **Source:** External event signal inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the forecast published at the origin, not the observed value.<br>- **Source:** Planned promotion flag inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the flag must be the plan as of the origin, not the promotion as finally run.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training with signals that arrive after the forecast time<br>- Evaluating at aggregate level only
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
