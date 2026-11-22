# Healthcare Compliance Control Effectiveness Prediction: model card and data card

> Generated from the blueprint `healthcare/healthcare-compliance-control-effectiveness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Control Effectiveness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Annual control rating by self-assessment.
- **Production model:** Deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender.
- **Intended use:** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test.
- **Out of scope:** - Control description wording: not risk.<br>- Owner tenure: not a control factor.<br>- Control identifier: label.
- **Primary metrics:** - Concordance index and time-dependent AUC at 90 and 180 days<br>- Precision at the review capacity<br>- Calibration of failure probabilities
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - New control<br>- Control redesigned<br>- Test results delayed<br>- Shared control across processes
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
- **Purpose:** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test.
- **Label:** For "Healthcare Compliance Control Effectiveness Prediction": Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Predicting failures that rules already show.
- **Sources:** - **Source:** Days overdue for testing inputs<br>**Owner:** Compliance<br>**System Of Record:** Control testing and GRC system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: test schedule.<br>- **Source:** Recent exception rate inputs<br>**Owner:** Risk management<br>**System Of Record:** Incident and exception records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Evidence staleness inputs<br>**Owner:** Internal audit<br>**System Of Record:** Remediation tracker<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: at scoring.<br>- **Source:** Related incident count inputs<br>**Owner:** Control owners<br>**System Of Record:** Evidence repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Predicting failures that rules already show<br>- Training on current ratings<br>- Scoring individuals
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
