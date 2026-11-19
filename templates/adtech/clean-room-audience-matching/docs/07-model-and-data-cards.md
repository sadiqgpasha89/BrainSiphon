# Data Clean-Room Audience Matching & Measurement: model card and data card

> Generated from the blueprint `adtech/clean-room-audience-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Clean-Room Audience Matching & Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Third-party cookie matching.
- **Production model:** PSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room.
- **Intended use:** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data.
- **Out of scope:** - Raw emails: not shared.<br>- Free-text addresses: messy.
- **Primary metrics:** - Match rate and precision<br>- Lift estimate error
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Match keys normalised differently<br>- Differencing attacks via repeated queries
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data.
- **Label:** For "Data Clean-Room Audience Matching & Measurement": Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Evaluating match rate without precision.
- **Sources:** - **Source:** Match key quality inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: normalisation.<br>- **Source:** Overlap estimate inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: DP.<br>- **Source:** Conversion lift in joined population inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: controls.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating match rate without precision<br>- Ignoring leakage tests
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
