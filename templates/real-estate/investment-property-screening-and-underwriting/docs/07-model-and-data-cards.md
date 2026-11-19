# Investment Property Screening & Underwriting: model card and data card

> Generated from the blueprint `real-estate/investment-property-screening-and-underwriting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Property Screening & Underwriting · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Spreadsheet screening by analysts, because it is the norm.
- **Production model:** Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities.
- **Intended use:** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.
- **Out of scope:** - Broker enthusiasm: Marketing language that does not tell the analyst about the property.<br>- Photo count: Reflects the brochure and not the investment.<br>- Deal name: A label chosen by the seller or broker with no link to returns.
- **Primary metrics:** - Screen precision<br>- NOI error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Missing rent roll<br>- Seller errors<br>- Rate changes
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.
- **Label:** For "Investment Property Screening & Underwriting": Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Past deals are those the team chose to pursue, so the data is biased toward what they already liked.
- **Sources:** - **Source:** Yield vs target inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: cap rates are computed on estimated income, so mark the income source.<br>- **Source:** Rent gap inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: market rents are estimates, so use an interval.<br>- **Source:** Capex need inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: estimates are rough, so keep a contingency band.<br>- **Source:** Debt service cover inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rates change, so recompute when rates move.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Past deals are those the team chose to pursue, so the data is biased toward what they already liked<br>- Optimistic seller data in the memorandum distorts any model trained on its figures
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
