# Hospital Quality Measure Performance Forecasting: model card and data card

> Generated from the blueprint `healthcare/hospital-quality-measure-performance-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hospital Quality Measure Performance Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Last 12-month average of the measure with a linear trend.
- **Production model:** Measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version.
- **Intended use:** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result.
- **Out of scope:** - Single-month spikes in small units: statistical noise.<br>- Unvalidated manual counts: inconsistent and unauditable.<br>- Provider names: unfair and not a system driver.
- **Primary metrics:** - WAPE and pinball loss by measure and horizon<br>- Interval coverage by denominator size<br>- Target-miss detection precision at the review budget
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Measure specification changes<br>- Late data corrections<br>- New unit<br>- Coding practice change
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
- **Purpose:** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result.
- **Label:** For "Hospital Quality Measure Performance Forecasting": Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Backtesting on final data without reporting lag.
- **Sources:** - **Source:** Risk-adjusted rate trend inputs<br>**Owner:** Quality and patient safety<br>**System Of Record:** Quality and performance reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the final adjusted data.<br>- **Source:** Denominator drift inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Enterprise data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use closed periods.<br>- **Source:** Process-measure lead indicator inputs<br>**Owner:** Finance<br>**System Of Record:** Measure specification library<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: same definition as the process measure.<br>- **Source:** Reporting completeness inputs<br>**Owner:** Health information management<br>**System Of Record:** EHR and claims-derived numerator and denominator data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: compute at each historical cut-off.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Backtesting on final data without reporting lag<br>- Mixing measure versions in training<br>- Ranking units by point rates
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
