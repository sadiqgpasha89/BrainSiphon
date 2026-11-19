# Acquisition Deal Sourcing: model card and data card

> Generated from the blueprint `real-estate/acquisition-deal-sourcing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Acquisition Deal Sourcing · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Analysts' lists from brokers, because it is the norm.
- **Production model:** Entity resolution, a sale-propensity model and a ranked outreach list.
- **Intended use:** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.
- **Out of scope:** - Owner name: A label that the model can memorise without learning why owners sell.<br>- Parcel ID: An administrative key with no information on sale intent.<br>- Broker: Who listed it before is not related to who will sell now.
- **Primary metrics:** - PR-AUC<br>- Lift
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Shell ownership<br>- Stale data<br>- Mass outreach
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.
- **Label:** For "Acquisition Deal Sourcing": Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Observed sales are biased towards properties that were listed, so off-market sales are missed.
- **Sources:** - **Source:** Debt maturity inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: debt data are incomplete for private loans.<br>- **Source:** Hold period inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: differs by owner type, so segment.<br>- **Source:** Owner entity graph inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: resolution errors merge unrelated owners.<br>- **Source:** Lease expiry inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: break options shift the real date.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Observed sales are biased towards properties that were listed, so off-market sales are missed<br>- Leakage when the sale itself changes the data, such as a new owner or loan
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
