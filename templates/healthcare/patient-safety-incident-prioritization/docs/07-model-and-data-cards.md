# Patient Safety Incident Prioritization: model card and data card

> Generated from the blueprint `healthcare/patient-safety-incident-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Incident Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword rules on the event category and harm field.
- **Production model:** A deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path.
- **Intended use:** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed.
- **Out of scope:** - Reporter name or role seniority: bias source and unrelated to severity.<br>- Report length: style rather than risk.<br>- Submission time of day: process artefact.
- **Primary metrics:** - Recall for high-severity reports at the review capacity<br>- Macro-F1 by event category<br>- Calibration error and subgroup parity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - New event type not in the taxonomy<br>- Report written in another language<br>- Delayed severity update<br>- Bulk submission after an incident
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
- **Purpose:** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed.
- **Label:** For "Patient Safety Incident Prioritization": Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Training on reporter-assigned severity.
- **Sources:** - **Source:** Narrative risk phrases inputs<br>**Owner:** Patient safety office<br>**System Of Record:** Incident reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: redacted text as at report time.<br>- **Source:** Event type and location risk inputs<br>**Owner:** Risk management<br>**System Of Record:** Patient safety event taxonomy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: taxonomy version.<br>- **Source:** Recurrence inputs<br>**Owner:** Quality<br>**System Of Record:** Risk management case system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: count only earlier events.<br>- **Source:** Report completeness inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Incident reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: at submission.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on reporter-assigned severity<br>- Random split that leaks duplicate reports<br>- Letting the model override a mandatory rule
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
