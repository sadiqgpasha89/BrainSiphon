# Healthcare Workforce Burnout & Attrition Early Warning: model card and data card

> Generated from the blueprint `healthcare/healthcare-workforce-burnout-attrition-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Burnout & Attrition Early Warning · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Quarterly unit turnover rate with a rolling average.
- **Production model:** Team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations.
- **Intended use:** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals.
- **Out of scope:** - Age, gender and ethnicity: protected traits with no place in the model.<br>- Individual sentiment from messages: surveillance and a consent problem.<br>- Health or leave reasons: sensitive data outside scope.
- **Primary metrics:** - Concordance index and time-dependent AUC at 6 and 12 months<br>- Calibration by unit size<br>- Subgroup fairness gap on prediction error
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - A team shrinks below the minimum size<br>- Reorganisation<br>- Survey non-response<br>- Misuse request
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
- **Purpose:** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals.
- **Label:** For "Healthcare Workforce Burnout & Attrition Early Warning": Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Evaluating on a random split of employees rather than by period.
- **Sources:** - **Source:** Schedule churn inputs<br>**Owner:** HR analytics<br>**System Of Record:** HR information system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use schedule snapshots prior to the outcome window.<br>- **Source:** Overtime load inputs<br>**Owner:** Employee wellbeing<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregate and lag it.<br>- **Source:** Vacancy burden inputs<br>**Owner:** Privacy office<br>**System Of Record:** Employee survey platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the vacancy snapshot.<br>- **Source:** Consecutive-shift pressure inputs<br>**Owner:** Nursing operations<br>**System Of Record:** Timekeeping system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregate only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on a random split of employees rather than by period<br>- Treating association as cause<br>- Letting a dashboard reveal a small group
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
