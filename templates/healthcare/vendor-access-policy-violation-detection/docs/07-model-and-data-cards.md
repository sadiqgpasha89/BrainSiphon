# Vendor Access Policy Violation Detection: model card and data card

> Generated from the blueprint `healthcare/vendor-access-policy-violation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Policy Violation Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Nightly report of access events outside the scheduled window.
- **Production model:** Deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation.
- **Intended use:** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff.
- **Out of scope:** - Vendor revenue: irrelevant.<br>- Badge reader brand: artefact.<br>- Representative identity: privacy.
- **Primary metrics:** - Rule precision and recall against security-confirmed violations<br>- Alert latency at the 95th percentile<br>- Severity ranking agreement with reviewers
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Clock skew between systems<br>- Authorisation entered late<br>- Door held open by staff<br>- Policy update
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
- **Purpose:** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff.
- **Label:** For "Vendor Access Policy Violation Detection": Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Letting an anomaly model define a violation.
- **Sources:** - **Source:** Authorisation mismatch inputs<br>**Owner:** Facility security<br>**System Of Record:** Facility access control system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: authorisations as at the event.<br>- **Source:** Credential state at event time inputs<br>**Owner:** Compliance<br>**System Of Record:** Visitor and vendor management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: point-in-time status.<br>- **Source:** Restricted-area sensitivity inputs<br>**Owner:** Vendor management<br>**System Of Record:** Access policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the zone register.<br>- **Source:** Repeat-pattern count inputs<br>**Owner:** Facility security<br>**System Of Record:** Credential compliance records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past events.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting an anomaly model define a violation<br>- Comparing events without time alignment<br>- Ignoring late authorisations
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
