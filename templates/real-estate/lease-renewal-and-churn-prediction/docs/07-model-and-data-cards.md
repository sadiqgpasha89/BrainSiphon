# Lease Renewal & Tenant Churn Prediction: model card and data card

> Generated from the blueprint `real-estate/lease-renewal-and-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Renewal & Tenant Churn Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Historic renewal rate by building, because managers use it.
- **Production model:** Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn.
- **Intended use:** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.
- **Out of scope:** - Unit floor: A weak and unstable relation to renewal once price and service are known.<br>- Name: Irrelevant and a route to bias.<br>- Lease signing weekday: Reflects the manager's schedule and says nothing about intent.
- **Primary metrics:** - PR-AUC<br>- Calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Rent control<br>- Building works<br>- Roommate change
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.
- **Label:** For "Lease Renewal & Tenant Churn Prediction": Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Past offers were not random, so renewals reflect the offer chosen and not the tenant.
- **Sources:** - **Source:** Renewal rent gap inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: market rent estimates are noisy, so use a range.<br>- **Source:** Maintenance resolution time inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: logging gaps understate delays, so use ticket close dates.<br>- **Source:** Tenure inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: strongly tied to age and life stage, so check for unfairness.<br>- **Source:** Life events inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data are partial and consent-based, so use only data the tenant has agreed to share.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Past offers were not random, so renewals reflect the offer chosen and not the tenant<br>- Seasonality in leases confuses year-to-year comparison
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
