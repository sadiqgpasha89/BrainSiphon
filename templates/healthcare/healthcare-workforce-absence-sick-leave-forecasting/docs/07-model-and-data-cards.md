# Healthcare Workforce Absence & Sick Leave Forecasting: model card and data card

> Generated from the blueprint `healthcare/healthcare-workforce-absence-sick-leave-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Absence & Sick Leave Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same weekday trailing average of the unit absence rate.
- **Production model:** Count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours.
- **Intended use:** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health.
- **Out of scope:** - Individual health or leave reasons: sensitive data.<br>- Past absence counts per person: privacy risk and stigma.<br>- Manager identity: not a stable driver.
- **Primary metrics:** - WAPE and pinball loss by horizon<br>- Interval coverage<br>- Contingency hours shortfall at the 90th percentile
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Small unit with sparse counts<br>- Outbreak week<br>- Leave policy change<br>- Roster reorganisation
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
- **Purpose:** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health.
- **Label:** For "Healthcare Workforce Absence & Sick Leave Forecasting": Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Training with individual reasons.
- **Sources:** - **Source:** Weekday and season profile inputs<br>**Owner:** Workforce planning<br>**System Of Record:** HR information system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: fit on past periods only.<br>- **Source:** Recent absence trend inputs<br>**Owner:** HR analytics<br>**System Of Record:** Timekeeping and leave records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregate and lag.<br>- **Source:** Shift-pattern load inputs<br>**Owner:** Privacy office<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the roster snapshot.<br>- **Source:** Holiday proximity inputs<br>**Owner:** Workforce planning<br>**System Of Record:** HR information system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: public calendar only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training with individual reasons<br>- Ignoring suppression in the test set<br>- Judging only on mean error
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
