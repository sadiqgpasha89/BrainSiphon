# Facility Access Pattern Anomaly Detection: model card and data card

> Generated from the blueprint `healthcare/facility-access-pattern-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Facility Access Pattern Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A report of badge use outside the shift window.
- **Production model:** Policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits.
- **Intended use:** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first.
- **Out of scope:** - Employee demographics: protected.<br>- Badge issue date: not behaviour.<br>- Reader vendor: artefact.
- **Primary metrics:** - Precision and recall of triaged findings at the alert budget<br>- Path-explanation usefulness rating<br>- Rule-versus-model agreement
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Reorganisation changes roles<br>- Large event or drill<br>- Reader failure<br>- Request for a named list
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
- **Purpose:** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first.
- **Label:** For "Facility Access Pattern Anomaly Detection": Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Treating anomalies as violations.
- **Sources:** - **Source:** Path novelty inputs<br>**Owner:** Facility security<br>**System Of Record:** Facility access control system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past paths.<br>- **Source:** Schedule alignment inputs<br>**Owner:** Privacy office<br>**System Of Record:** Identity and role directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Role-zone fit inputs<br>**Owner:** HR operations<br>**System Of Record:** Shift and roster system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: role as of the event.<br>- **Source:** Peer deviation inputs<br>**Owner:** Facilities<br>**System Of Record:** Access policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: same period.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating anomalies as violations<br>- Ignoring shift context<br>- Retaining badge data beyond the stated purpose
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
