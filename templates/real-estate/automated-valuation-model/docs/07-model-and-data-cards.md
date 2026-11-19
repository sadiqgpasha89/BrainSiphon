# Automated Valuation Model (AVM): model card and data card

> Generated from the blueprint `real-estate/automated-valuation-model` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Valuation Model (AVM) · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations.
- **Production model:** Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value.
- **Intended use:** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.
- **Out of scope:** - Listing description adjectives: marketing language with little extra signal.<br>- Days since the listing photo upload: portal behaviour, not value.<br>- Owner name: no causal link and a privacy risk.
- **Primary metrics:** - Median absolute percentage error by market<br>- Share of values within 10% of the sale price
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Thin market<br>- Unique property<br>- Rapid market shift
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
- **Purpose:** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.
- **Label:** For "Automated Valuation Model (AVM)": Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Training on sales after the valuation date leaks the trend.
- **Sources:** - **Source:** Comparable sale density inputs<br>**Owner:** Valuation and collateral analytics<br>**System Of Record:** Property registry, cadastre and assessor records<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: only sales that closed before the valuation date.<br>- **Source:** Price per square metre by micro-area inputs<br>**Owner:** Property data office<br>**System Of Record:** Listing and MLS data (licensed)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: neighbourhood boundaries must be stable.<br>- **Source:** Condition score from photos inputs<br>**Owner:** Appraisal operations<br>**System Of Record:** Transaction and deed records<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: listing photos are staged and flattering.<br>- **Source:** Renovation permits inputs<br>**Owner:** Valuation and collateral analytics<br>**System Of Record:** Appraisal and collateral-management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: permit data quality varies by municipality.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on sales after the valuation date leaks the trend<br>- Random split lets the same street sit in train and test
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
