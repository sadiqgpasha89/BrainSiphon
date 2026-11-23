# Demand Forecasting for Make-to-Stock Items: how well the starter fits

> Generated from the blueprint `manufacturing/make-to-stock-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- The kit forecasts a series; this use case predicts a per-shipment or per-order quantity with an interval, so change the unit of prediction and its features
- Add hierarchical reconciliation, cold-start or intermittent-demand handling, which the kit does not implement

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Multi-horizon forecasting: Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand | Multi-horizon forecasting | match |  |
| label | Future values of many series at several horizons | The observed value h days after a forecast origin, divided by the series' recent average at the origin, so one model serves every series | match |  |
| validation | Rolling forecast origins with origin-safe features | Rolling forecast origins with origin-safe features and late-arriving feeds | match |  |
| metrics | Weighted quantile loss by family; Bias; Coverage of intervals | Weighted absolute percentage error by horizon, forecast value added against a seasonal baseline and prediction-band coverage | match |  |
| data | Many time series with seasonality, calendar effects and late-arriving data | Many daily series with calendar effects, planned events, censored demand (stock-outs) and late feeds | adapt | The kit forecasts a series; this use case predicts a per-shipment or per-order quantity with an interval, so change the unit of prediction and its features |
| model | Baseline: Seasonal naive with a moving average on shipments, because planners trust it and it sets the floor. Production: A global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hier… | Seasonal baseline against quantile gradient boosting | adapt | Add hierarchical reconciliation, cold-start or intermittent-demand handling, which the kit does not implement |
| serving | Scheduled batch run | Offline backtest scripts only: no scheduled pipeline, publishing or reconciliation | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Feature build (calendar and promotion joins); Planner review (planning tool): a person in the loop | None. Runs locally on synthetic retail-style demand | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
