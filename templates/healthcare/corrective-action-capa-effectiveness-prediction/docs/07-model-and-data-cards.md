# Corrective Action & CAPA Effectiveness Prediction: model card and data card

> Generated from the blueprint `healthcare/corrective-action-capa-effectiveness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corrective Action & CAPA Effectiveness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Overdue-action report and a manual 90-day check.
- **Production model:** Rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline.
- **Intended use:** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee.
- **Out of scope:** - Action text length: style.<br>- Owner seniority: not a cause of effectiveness.<br>- Meeting where the action was agreed: context not mechanism.
- **Primary metrics:** - Concordance index and time-dependent AUC at 6 and 12 months<br>- Calibration of recurrence risk<br>- Overdue-action rule precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Concurrent changes<br>- Low event volume<br>- Action reopened<br>- Reclassified event
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
- **Purpose:** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee.
- **Label:** For "Corrective Action & CAPA Effectiveness Prediction": Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Treating closure as effectiveness.
- **Sources:** - **Source:** Action strength inputs<br>**Owner:** Quality and patient safety<br>**System Of Record:** Quality management and CAPA system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the plan.<br>- **Source:** Implementation evidence inputs<br>**Owner:** Risk management<br>**System Of Record:** Incident reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: as at scoring.<br>- **Source:** Pre-action event rate inputs<br>**Owner:** Action owners<br>**System Of Record:** Action-tracking and audit system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: window before the action date.<br>- **Source:** Owner load inputs<br>**Owner:** Compliance<br>**System Of Record:** Quality management and CAPA system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: counts as at scoring.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating closure as effectiveness<br>- Ignoring regression to the mean<br>- Ignoring right-censoring
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
