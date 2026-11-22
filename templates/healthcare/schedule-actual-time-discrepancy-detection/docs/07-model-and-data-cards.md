# Schedule vs Actual Time Discrepancy Detection: model card and data card

> Generated from the blueprint `healthcare/schedule-actual-time-discrepancy-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Schedule vs Actual Time Discrepancy Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Payroll rule report of missing and overlapping punches.
- **Production model:** Deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact.
- **Intended use:** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path.
- **Out of scope:** - Employee tenure or role seniority: irrelevant to a rule breach and a fairness risk.<br>- Historic flag count per person: self-reinforcing and punitive.<br>- Time-clock location: explains process not discrepancy.
- **Primary metrics:** - Precision and recall of exceptions against payroll adjudication<br>- Payroll-effect error<br>- Share of exceptions explained by a rule
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Daylight-saving change<br>- Offline time clock<br>- Shift swap not reflected in the schedule<br>- Cross-facility shift
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
- **Purpose:** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path.
- **Label:** For "Schedule vs Actual Time Discrepancy Detection": Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Training on already-corrected data.
- **Sources:** - **Source:** Punch-to-schedule delta inputs<br>**Owner:** Payroll<br>**System Of Record:** Timekeeping system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use punch time not the entry time.<br>- **Source:** Edit history inputs<br>**Owner:** Timekeeping administration<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use only edits logged before scoring.<br>- **Source:** Duplicate signature inputs<br>**Owner:** HR operations<br>**System Of Record:** Payroll system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: match on pseudonymous ID and time window.<br>- **Source:** Approval gap inputs<br>**Owner:** Payroll<br>**System Of Record:** Leave and absence records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: approval records as of the cut-off.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on already-corrected data<br>- Labelling dispute outcomes as ground truth<br>- Using badge data outside policy
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
