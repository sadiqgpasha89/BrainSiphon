# Vendor Visit Demand Forecasting: model card and data card

> Generated from the blueprint `healthcare/vendor-visit-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Visit Demand Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same-weekday trailing average of visits.
- **Production model:** Hierarchical count forecasting with service-line and booking-pace drivers, quantile outputs at the hour level and a capacity planner that converts the peak quantile into desk staffing.
- **Intended use:** Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion.
- **Out of scope:** - Vendor brand: not a stable driver.<br>- Individual representative identity: privacy.<br>- Weather: minor effect.
- **Primary metrics:** - WAPE and pinball loss by hour and facility<br>- Peak-hour coverage at the 90th percentile<br>- Interval coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Facility closure<br>- New vendor programme<br>- Check-in outage<br>- Policy change in access windows
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
- **Purpose:** Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion.
- **Label:** For "Vendor Visit Demand Forecasting": Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Using bookings as the target.
- **Sources:** - **Source:** Booking pace inputs<br>**Owner:** Facility operations<br>**System Of Record:** Visitor and vendor management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: snapshot at forecast time.<br>- **Source:** Service-line schedule load inputs<br>**Owner:** Vendor management<br>**System Of Record:** Facility operations calendar<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule snapshot.<br>- **Source:** Seasonality inputs<br>**Owner:** Supply chain<br>**System Of Record:** Service-line schedule system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past data.<br>- **Source:** Event flags inputs<br>**Owner:** Facility operations<br>**System Of Record:** Visitor and vendor management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: published calendars.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using bookings as the target<br>- Scoring on daily totals only<br>- Ignoring cancellations
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
