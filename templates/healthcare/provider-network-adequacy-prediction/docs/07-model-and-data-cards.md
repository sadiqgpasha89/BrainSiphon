# Provider Network Adequacy Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-network-adequacy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Adequacy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A quarterly spreadsheet check of provider counts against the standard.
- **Production model:** A geospatial adequacy engine with road-network travel times, a capacity forecaster that separates directory presence from appointment availability, a versioned standards register and an interval-based evidence report.
- **Intended use:** Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail.
- **Out of scope:** - Provider marketing text: not capacity.<br>- Directory sort order: artefact.<br>- Practice name: label.
- **Primary metrics:** - Agreement of adequacy results with manual network audits<br>- Capacity-estimate error against observed slots<br>- Interval coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Stale directory<br>- Telehealth providers<br>- Standard changes mid-year<br>- Sparse rural area
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail.
- **Label:** For "Provider Network Adequacy Prediction": Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Counting directory presence as capacity.
- **Sources:** - **Source:** Travel time to the nearest qualified provider inputs<br>**Owner:** Network management<br>**System Of Record:** Provider directory and network management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: road network version.<br>- **Source:** Accepting status and appointment capacity inputs<br>**Owner:** Compliance<br>**System Of Record:** Appointment availability data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data freshness shown.<br>- **Source:** Provider-to-member ratio inputs<br>**Owner:** Provider relations<br>**System Of Record:** Member enrolment and geography<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: member counts at the date.<br>- **Source:** Directory freshness inputs<br>**Owner:** Regulatory affairs<br>**System Of Record:** Regulatory standards register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source dates.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting directory presence as capacity<br>- Using straight-line distance<br>- Applying an outdated standard
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
