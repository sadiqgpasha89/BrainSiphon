# Physician Availability & Schedule Conflict Detection: model card and data card

> Generated from the blueprint `healthcare/physician-availability-schedule-conflict-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Availability & Schedule Conflict Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Schedulers find conflicts when physicians or patients complain.
- **Production model:** A temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office.
- **Intended use:** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage.
- **Out of scope:** - Commitment title: label.<br>- Entry time: process artefact.<br>- Physician seniority: not a conflict factor.
- **Primary metrics:** - Conflict detection precision and recall on audited schedules<br>- Severity agreement with the scheduling office<br>- Time from schedule change to detection
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Time zone difference between systems<br>- Telehealth from a remote site<br>- Cancelled but not removed event<br>- Recurring series with exceptions
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
- **Purpose:** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage.
- **Label:** For "Physician Availability & Schedule Conflict Detection": Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Using a model for logical conflicts.
- **Sources:** - **Source:** Overlap duration inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Clinic scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event times.<br>- **Source:** Travel infeasibility margin inputs<br>**Owner:** Clinical operations<br>**System Of Record:** OR scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: travel-time table version.<br>- **Source:** Privilege and site eligibility inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Call and telehealth schedules<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: privilege register.<br>- **Source:** Affected patient volume inputs<br>**Owner:** Access centre<br>**System Of Record:** Facility location and travel-time tables<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule snapshot.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using a model for logical conflicts<br>- Ignoring travel time<br>- Rescheduling without office confirmation
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
