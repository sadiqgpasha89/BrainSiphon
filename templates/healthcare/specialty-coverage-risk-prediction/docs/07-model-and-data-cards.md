# Specialty Coverage Risk Prediction: model card and data card

> Generated from the blueprint `healthcare/specialty-coverage-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Specialty Coverage Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Coverage gaps are discovered by the scheduling office as they appear.
- **Production model:** A deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list.
- **Intended use:** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate.
- **Out of scope:** - Specialty name: label.<br>- Roster file format: artefact.<br>- Physician seniority: not a driver.
- **Primary metrics:** - PR-AUC and precision at the review capacity<br>- Lead time of correct gap warnings<br>- Calibration of gap probabilities
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Rare specialty with few gaps<br>- Late leave request<br>- Credential lapse<br>- Shared coverage across sites
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
- **Purpose:** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate.
- **Label:** For "Specialty Coverage Risk Prediction": Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Predicting shortfalls that rules show.
- **Sources:** - **Source:** Coverage depth inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Coverage roster and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Demand-to-capacity ratio inputs<br>**Owner:** Medical group leadership<br>**System Of Record:** Leave and vacancy records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: forecast snapshot.<br>- **Source:** Credential and privilege expiry inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Privilege and credential records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: credential records.<br>- **Source:** Historical gap frequency inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Demand and census feeds<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Predicting shortfalls that rules show<br>- Random splits<br>- Contacting physicians from a score
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
