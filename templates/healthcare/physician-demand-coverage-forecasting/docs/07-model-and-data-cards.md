# Physician Demand & Coverage Forecasting: model card and data card

> Generated from the blueprint `healthcare/physician-demand-coverage-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Demand & Coverage Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Next quarter coverage is copied from the same quarter last year.
- **Production model:** A hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view.
- **Intended use:** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand.
- **Out of scope:** - Individual physician identity: not a demand driver.<br>- Clinic naming: label.<br>- Appointment booking channel: not workload.
- **Primary metrics:** - Weighted quantile loss and coverage of prediction intervals<br>- Hierarchical consistency error<br>- Shortage-risk precision at the review capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - New clinic or service line<br>- Demand spike from an outbreak<br>- Roster not yet final<br>- Holiday timing shifts
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
- **Purpose:** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand.
- **Label:** For "Physician Demand & Coverage Forecasting": Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Evaluating on random splits.
- **Sources:** - **Source:** Booked and referred demand inputs<br>**Owner:** Medical group leadership<br>**System Of Record:** Scheduling and appointment system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: snapshot at forecast time.<br>- **Source:** Seasonality and calendar inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Procedure and OR scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calendar tables.<br>- **Source:** Census and admission trend inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Census and admissions feed<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Available physician capacity inputs<br>**Owner:** Finance<br>**System Of Record:** Physician roster and coverage policy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: roster snapshot.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on random splits<br>- Ignoring reconciliation<br>- Treating the forecast as the schedule
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
