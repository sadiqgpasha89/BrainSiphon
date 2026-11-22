# Healthcare Workforce Demand Forecasting by Unit: model card and data card

> Generated from the blueprint `healthcare/healthcare-workforce-demand-forecasting-by-unit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Demand Forecasting by Unit · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks.
- **Production model:** Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model.
- **Intended use:** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start.
- **Out of scope:** - Paid hours including overtime: reflects past shortage decisions and not the demand that caused them.<br>- Individual employee attributes: demand is a property of the unit and shift and personal data adds privacy risk without signal.<br>- Same-day census revisions: arrive after the planning cut-off and leak the answer.
- **Primary metrics:** - WAPE and pinball loss by horizon and role<br>- Interval coverage at 80 and 95 percent<br>- Reconciliation error between unit and facility totals
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - New unit opens or closes<br>- Late or revised ADT feed<br>- Policy ratio change<br>- Pandemic or regional surge
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
- **Purpose:** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start.
- **Label:** For "Healthcare Workforce Demand Forecasting by Unit": Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Training on paid hours that reflect past shortages.
- **Sources:** - **Source:** Acuity-weighted workload inputs<br>**Owner:** Nursing and clinical workforce planning<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the acuity score as charted at forecast time.<br>- **Source:** Planned procedure load inputs<br>**Owner:** Patient flow and capacity management<br>**System Of Record:** Patient flow and ADT system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the schedule snapshot as it stood at forecast time, not the cases that finally happened.<br>- **Source:** Admission and discharge rhythm inputs<br>**Owner:** Finance workforce analytics<br>**System Of Record:** Timekeeping and payroll system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: compute from event time not from the processing time of the feed.<br>- **Source:** Holiday and event calendar inputs<br>**Owner:** HR information systems<br>**System Of Record:** Staffing policy and approved-ratio register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: only calendars published before the forecast date.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on paid hours that reflect past shortages<br>- Scoring accuracy on the last 24 hours only<br>- Letting actual census leak into the forecast features
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
