# Healthcare Workforce Demand Forecasting by Unit: how well the starter fits

> Generated from the blueprint `healthcare/healthcare-workforce-demand-forecasting-by-unit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `forecast` (Multi-horizon forecasting from an origin snapshot) · **Fit:** adaptable · **Problem type:** `forecasting`

The `forecast` engine implements a neighbouring problem. This use case is `forecasting`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Reading a late feed as zero
- Training on capped values
- Judging a model against nothing
- Reporting aggregate accuracy

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Add hierarchical reconciliation, cold-start or intermittent-demand handling, which the kit does not implement

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Multi-horizon forecasting: Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of dis… | Multi-horizon forecasting | match |  |
| label | Future values of many series at several horizons | The observed value h days after a forecast origin, divided by the series' recent average at the origin, so one model serves every series | match |  |
| validation | Rolling forecast origins with origin-safe features | Rolling forecast origins with origin-safe features and late-arriving feeds | match |  |
| metrics | WAPE and pinball loss by horizon and role; Interval coverage at 80 and 95 percent; Reconciliation error between unit and facility totals | Weighted absolute percentage error by horizon, forecast value added against a seasonal baseline and prediction-band coverage | match |  |
| data | Many time series with seasonality, calendar effects and late-arriving data | Many daily series with calendar effects, planned events, censored demand (stock-outs) and late feeds | match |  |
| model | Baseline: Seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks. Production: Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bot… | Seasonal baseline against quantile gradient boosting | adapt | Add hierarchical reconciliation, cold-start or intermittent-demand handling, which the kit does not implement |
| serving | Scheduled batch run | Offline backtest scripts only: no scheduled pipeline, publishing or reconciliation | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Census and schedule intake (ADT feed and scheduling extract); Workload feature builder (point-in-time feature store); Staffing leader review (human): a person in the loop; Forecast archive and feedback (lakehouse) | None. Runs locally on synthetic retail-style demand | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
