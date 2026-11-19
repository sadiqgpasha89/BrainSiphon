# Remote Patient Monitoring Anomaly Detection: model card and data card

> Generated from the blueprint `healthcare/remote-patient-monitoring-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remote Patient Monitoring Anomaly Detection · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed clinical thresholds per vital.
- **Production model:** Bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue.
- **Intended use:** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise.
- **Out of scope:** - Single outlier reading: measurement error.<br>- Day of week: none.
- **Primary metrics:** - Event detection lead time<br>- Alerts per patient-month
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Faulty scale readings<br>- Care-team capacity drops
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
- **Purpose:** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise.
- **Label:** For "Remote Patient Monitoring Anomaly Detection": Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Alerts judged only by acted-upon ones.
- **Sources:** - **Source:** Deviation from personal baseline inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: window excludes current reading.<br>- **Source:** Trend slope over 3 days inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: measurement timing adjustment.<br>- **Source:** Measurement gap duration inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: distinguish device failure.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Alerts judged only by acted-upon ones<br>- Retrospective data from engaged patients only
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
