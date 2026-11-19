# Rent Delinquency Prediction: model card and data card

> Generated from the blueprint `real-estate/rent-delinquency-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rent Delinquency Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Late fees history flag, because managers already use it.
- **Production model:** Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow.
- **Intended use:** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.
- **Out of scope:** - Unit number: An arbitrary label that can proxy for building quality or floor.<br>- Name: Irrelevant to payment behaviour and a route to bias.<br>- Lease start day: Weakly tied to payment dates and not to difficulty paying.
- **Primary metrics:** - PR-AUC<br>- Calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Payday timing<br>- Rent assistance pending<br>- Dispute
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
- **Purpose:** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.
- **Label:** For "Rent Delinquency Prediction": Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm.
- **Sources:** - **Source:** Payment timing drift inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: autopay hides it, so analyse autopay tenants through a different signal.<br>- **Source:** Portal activity inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: noisy, and depends on how often tenants log in.<br>- **Source:** Rent burden change inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: income data are often missing, so mark unknown explicitly.<br>- **Source:** Maintenance disputes inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: logging is inconsistent, so use only closed-loop ticket data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm<br>- Autopay hides risk until a card fails, which distorts the timing signal
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
