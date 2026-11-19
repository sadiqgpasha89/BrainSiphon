# Flood & Climate Risk Scoring for Properties: model card and data card

> Generated from the blueprint `real-estate/flood-and-climate-risk-scoring-for-properties` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flood & Climate Risk Scoring for Properties · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Official flood zone maps, because lenders require them.
- **Production model:** Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals.
- **Intended use:** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.
- **Out of scope:** - Owner: Owner identity has no physical link to hazard.<br>- Address string: The text of an address is not a risk factor and can encode area bias.<br>- Photo: A listing photo says nothing about flood or fire exposure.
- **Primary metrics:** - Brier score<br>- Claims calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - New defences<br>- Basement<br>- Model update
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.
- **Label:** For "Flood & Climate Risk Scoring for Properties": Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Claims come from a few events, so models fit those events and miss others.
- **Sources:** - **Source:** Elevation above river inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: liDAR resolution and age limit precision.<br>- **Source:** Distance to water inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: straight-line distance misleads, so use flow paths.<br>- **Source:** Vegetation fuel inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: seasonal, so use the dry-season image.<br>- **Source:** Historic claims density inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: privacy-restricted, and claims depend on take-up.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Claims come from a few events, so models fit those events and miss others<br>- Scenario uncertainty is wider than the differences between models, so validation on past data is a weak guide
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
