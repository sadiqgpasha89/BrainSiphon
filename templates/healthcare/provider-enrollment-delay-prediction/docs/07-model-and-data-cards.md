# Provider Enrollment Delay Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-enrollment-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Enrollment Delay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Median historical turnaround by payer.
- **Production model:** Discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks.
- **Intended use:** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.
- **Out of scope:** - Provider reputation: irrelevant to administrative processing.<br>- Payer contact name: personal and unstable.<br>- Final status code: contains the outcome.
- **Primary metrics:** - Concordance index and time-dependent AUC at 30 and 60 days<br>- Date-range coverage<br>- Bottleneck top-1 accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Payer changes process<br>- Application withdrawn<br>- Roster file rejected<br>- New payer
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
- **Purpose:** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.
- **Label:** For "Provider Enrollment Delay Prediction": Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Starting the clock before the file is complete.
- **Sources:** - **Source:** Completeness at submission inputs<br>**Owner:** Provider enrollment<br>**System Of Record:** Provider enrollment system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: as of the submission event.<br>- **Source:** Payer SLA position inputs<br>**Owner:** Revenue cycle<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use payer SLA table versions.<br>- **Source:** Stage dwell time inputs<br>**Owner:** Managed-care contracting<br>**System Of Record:** Payer portals and roster files<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: computed from event time.<br>- **Source:** Follow-up count inputs<br>**Owner:** Provider enrollment<br>**System Of Record:** Revenue cycle system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: count only prior follow-ups.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Starting the clock before the file is complete<br>- Using final status as a feature<br>- Pooling all payers into one model
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
