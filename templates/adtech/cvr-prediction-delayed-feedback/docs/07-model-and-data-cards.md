# Conversion Rate Prediction with Delayed Feedback: model card and data card

> Generated from the blueprint `adtech/cvr-prediction-delayed-feedback` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversion Rate Prediction with Delayed Feedback · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Train on conversions within a fixed 24-hour window.
- **Production model:** Delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation.
- **Intended use:** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters.
- **Out of scope:** - Click ID: random.<br>- Campaign creation date: cohort artefact.
- **Primary metrics:** - Calibration at matured labels<br>- Log-loss on mature cohorts
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Attribution partner changes lookback window<br>- Tracking outage drops conversion postbacks
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters.
- **Label:** For "Conversion Rate Prediction with Delayed Feedback": Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Evaluating on immature labels.
- **Sources:** - **Source:** Elapsed time since click inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: server clock.<br>- **Source:** Product category delay profile inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: matured cohorts.<br>- **Source:** Click quality features inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: consent.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on immature labels<br>- Dropping late conversions from evaluation sets
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
