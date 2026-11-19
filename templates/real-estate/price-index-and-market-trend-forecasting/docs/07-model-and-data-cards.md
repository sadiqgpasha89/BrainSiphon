# House Price Index & Market Trend Forecasting: model card and data card

> Generated from the blueprint `real-estate/price-index-and-market-trend-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** House Price Index & Market Trend Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Median sale price by area with a naive trend, because press releases use it.
- **Production model:** A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control.
- **Intended use:** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.
- **Out of scope:** - Social posts: Sentiment volumes swing with news cycles and carry little information about transaction prices.<br>- Single-sale outliers: One unusual sale such as a family transfer or a distressed deal should not move an area index.<br>- Agent commentary: Opinion that is not measured and cannot be reproduced.
- **Primary metrics:** - Forecast error by horizon<br>- Index revision size
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Revisions<br>- Thin markets<br>- Policy changes
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.
- **Label:** For "House Price Index & Market Trend Forecasting": Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: A back-test run only through a rising market flatters any model that predicts continued growth.
- **Sources:** - **Source:** Repeat-sales pairs inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: few pairs exist in thin markets, so pool by region and report the count.<br>- **Source:** Mortgage rate inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the rate known at the forecast date, not the revised one.<br>- **Source:** Active listings inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: definitions of active differ by portal, so standardise before comparing.<br>- **Source:** Search interest inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: search volume is noisy and affected by portal changes, so check for breaks in the series.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A back-test run only through a rising market flatters any model that predicts continued growth<br>- Look-ahead on revised data, since sales recorded later change earlier index values
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
