# Care-Team Coordination Bottleneck Detection: model card and data card

> Generated from the blueprint `healthcare/care-team-coordination-bottleneck-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Coordination Bottleneck Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A manager reviews a monthly report of discharge delays.
- **Production model:** Event-log cleaning and process mining to map pathways, duration models and statistical anomaly detection on stage waiting times, and a driver analysis that uses context features with associations labelled as such.
- **Intended use:** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected.
- **Out of scope:** - Case identifier: label.<br>- Free-text task notes: noisy.<br>- Task creator: not a bottleneck factor.
- **Primary metrics:** - Stage-delay detection agreement with process owner review<br>- Event-log completeness<br>- Stability of bottleneck rankings across periods
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Missing timestamps<br>- Rework loops<br>- Process changed mid-period<br>- Small pathway
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
- **Purpose:** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected.
- **Label:** For "Care-Team Coordination Bottleneck Detection": Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Reading associations as causes.
- **Sources:** - **Source:** Stage waiting time inputs<br>**Owner:** Process owners<br>**System Of Record:** Workflow and task management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event timestamps.<br>- **Source:** Handoff volume and queue length inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Referral and consult system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event stream.<br>- **Source:** Variant frequency inputs<br>**Owner:** Care coordination<br>**System Of Record:** Discharge milestone records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event log.<br>- **Source:** Staffing and census context inputs<br>**Owner:** Quality<br>**System Of Record:** Message event data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Reading associations as causes<br>- Rating individuals<br>- Mining incomplete event logs
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
