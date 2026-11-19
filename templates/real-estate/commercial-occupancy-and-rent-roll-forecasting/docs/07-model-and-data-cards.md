# Commercial Occupancy & Rent-Roll Forecasting: model card and data card

> Generated from the blueprint `real-estate/commercial-occupancy-and-rent-roll-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Occupancy & Rent-Roll Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Assume a flat renewal rate and market rent growth, because it is simple.
- **Production model:** Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts.
- **Intended use:** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.
- **Out of scope:** - Property name: A label that carries no income information.<br>- Manager: The identity of the property manager does not change lease terms.<br>- Photo: Images of the building say nothing about lease expiries or tenants.
- **Primary metrics:** - Occupancy error<br>- Income error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Anchor tenant leaves<br>- Incentives<br>- Redevelopment
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
- **Purpose:** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.
- **Label:** For "Commercial Occupancy & Rent-Roll Forecasting": Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: A back-test through a strong market makes any renewal assumption look good.
- **Sources:** - **Source:** Expiry profile inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: break options can move the real expiry earlier, so include them.<br>- **Source:** Renewal propensity inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: few renewal events per tenant, so pool by tenant type.<br>- **Source:** Submarket vacancy inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sources define vacancy differently, so use one source throughout.<br>- **Source:** Rent gap to market inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: market rent estimates are uncertain, so carry an interval.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A back-test through a strong market makes any renewal assumption look good<br>- Errors in the lease data feed straight through to the forecast and are mistaken for model error
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
