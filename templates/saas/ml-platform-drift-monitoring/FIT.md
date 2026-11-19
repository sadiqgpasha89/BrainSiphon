# ML Platform: Drift & Quality Monitoring: how well the starter fits

> Generated from the blueprint `saas/ml-platform-drift-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `anomaly` (Anomaly detection on seasonal metrics) · **Fit:** adaptable · **Problem type:** `tabular-anomaly-detection`

The `anomaly` engine implements a neighbouring problem. This use case is `tabular-anomaly-detection`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Ignoring seasonality
- Alerting on events you scheduled
- Tuning the threshold on the data you report
- A rolling window that includes the present

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace the seasonal metric series with the entity-level feature stream the use case scores, and define the anomaly interval for it
- Replace the seasonal residual and calendar features with the use case's behavioural features and their baselines
- Keep the alert budget, the detection-delay measure and the no-future test unchanged
- Score "Detection of injected drift" and "Correlation of estimated and realised performance" instead of the kit metrics
- Replace the synthetic data (Metric series, seasonal residuals, alerts and incidents) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Platform-level monitors with importance-weighted drift, label-free performance estimation and alert…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Anomaly detection on entity features: Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness | Anomaly detection on time series | adapt | The kit implements anomaly detection on time series; this use case is anomaly detection on entity features. Only the reusable parts carry over (see the modifications) |
| label | Whether an entity or event departs from its normal behaviour, judged against injected or confirmed cases | A point is anomalous when it lies inside a known anomaly interval; an event is detected when an alert fires inside it (or shortly after) | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Chronological evaluation at a fixed alert budget with injected or replayed cases | Chronological evaluation with a fixed alert budget and no-future features | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Detection of injected drift; Correlation of estimated and realised performance | Recall, detection delay and false alerts per series per week at a fixed alert budget | adapt | Score "Detection of injected drift" and "Correlation of estimated and realised performance" instead of the kit metrics |
| data | Entity-level behaviour features over time | Operational metric series with daily and weekly seasonality, level shifts, drift and calendar effects | adapt | Replace the synthetic data (Metric series, seasonal residuals, alerts and incidents) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Manual dashboards for a few models. Production: Platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies… | Rolling z-score, robust seasonal baseline and a calendar-aware version | adapt | Replace the kit's models with the blueprint's: Platform-level monitors with importance-weighted drift, label-free performance estimation and alert… |
| serving | Scheduled batch run | Offline scripts only: no streaming scorer, alert routing or suppression service | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | No external system beyond the data source | None. Runs locally on synthetic operational metrics | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
