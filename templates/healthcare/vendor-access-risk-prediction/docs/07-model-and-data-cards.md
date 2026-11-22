# Vendor Access Risk Prediction: model card and data card

> Generated from the blueprint `healthcare/vendor-access-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Report of vendor access outside scheduled hours.
- **Production model:** A policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context.
- **Intended use:** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation.
- **Out of scope:** - Vendor company name: irrelevant to behaviour.<br>- Individual representative demographics: protected.<br>- Badge reader brand: hardware artefact.
- **Primary metrics:** - Precision and recall of confirmed review findings at the alert budget<br>- Rule-versus-model agreement<br>- Explanation usefulness rating from reviewers
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - New vendor<br>- Emergency repair outside normal hours<br>- Reader outage<br>- Credential sharing suspicion
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation.
- **Label:** For "Vendor Access Risk Prediction": Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Training on investigated cases only.
- **Sources:** - **Source:** Time and zone deviation inputs<br>**Owner:** Facility security<br>**System Of Record:** Facility access control system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: baselines from earlier periods.<br>- **Source:** Frequency change inputs<br>**Owner:** Vendor management<br>**System Of Record:** Visitor and vendor management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: trailing windows.<br>- **Source:** Access path novelty inputs<br>**Owner:** Privacy office<br>**System Of Record:** Role-based access policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past paths only.<br>- **Source:** Authorisation gap inputs<br>**Owner:** Compliance<br>**System Of Record:** Facility access control system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule snapshot at the time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on investigated cases only<br>- Treating anomalies as violations<br>- Ignoring planned work context
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
