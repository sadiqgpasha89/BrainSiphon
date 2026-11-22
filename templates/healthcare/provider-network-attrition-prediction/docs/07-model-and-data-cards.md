# Provider Network Attrition Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-network-attrition-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Attrition Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Provider relations reacts when a provider gives notice.
- **Production model:** A discrete-time survival model with calibrated risk and operational driver explanations, a network-criticality overlay that prioritises outreach, fairness and privacy review, and a retention task workflow.
- **Intended use:** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use.
- **Out of scope:** - Provider name: label.<br>- Contract identifier: label.<br>- Specialty marketing: not signal.
- **Primary metrics:** - Concordance index and time-dependent AUC at 6 and 12 months<br>- Calibration by provider group<br>- Precision at the outreach capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Merger of provider groups<br>- Planned retirement<br>- Contract renegotiation<br>- Small group
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
- **Purpose:** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use.
- **Label:** For "Provider Network Attrition Prediction": Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Using the score in payment or contracting decisions.
- **Sources:** - **Source:** Contract end proximity inputs<br>**Owner:** Network management<br>**System Of Record:** Network contracting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract records.<br>- **Source:** Participation trend inputs<br>**Owner:** Provider relations<br>**System Of Record:** Provider participation records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Service issue history inputs<br>**Owner:** Contracting<br>**System Of Record:** Claims and utilisation warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: issue log.<br>- **Source:** Network role inputs<br>**Owner:** Compliance<br>**System Of Record:** Provider service and issue log<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: network rules.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using the score in payment or contracting decisions<br>- Reviewing only average accuracy<br>- Using unlicensed data
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
