# Connected-TV Ad Avails & Reach Forecasting: model card and data card

> Generated from the blueprint `adtech/ctv-ad-avails-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Connected-TV Ad Avails & Reach Forecasting · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Average daily impressions by app.
- **Production model:** Probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates.
- **Intended use:** Forecast ad avails and campaign reach on connected TV across apps and household devices.
- **Out of scope:** - App version: none.<br>- Device ID: none.
- **Primary metrics:** - Reach error vs panel<br>- Quantile loss
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Streaming service launches new tier<br>- Household identity changes
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Forecast ad avails and campaign reach on connected TV across apps and household devices.
- **Label:** For "Connected-TV Ad Avails & Reach Forecasting": Forecast ad avails and campaign reach on connected TV across apps and household devices. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Evaluating impressions not reach.
- **Sources:** - **Source:** Household viewing frequency distribution inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: measurement.<br>- **Source:** Programming schedule inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule.<br>- **Source:** Device mix inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: telemetry.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating impressions not reach<br>- Panel bias ignored
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
