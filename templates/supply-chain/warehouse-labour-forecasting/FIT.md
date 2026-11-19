# Warehouse Labour Demand Forecasting: how well the starter fits

> Generated from the blueprint `supply-chain/warehouse-labour-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Replace the kit's models with the blueprint's: Order-driven workload model with learned productivity and quantile hours forecasts feeding the staf…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Multi-horizon forecasting: Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime | Multi-horizon forecasting | match |  |
| label | Future values of many series at several horizons | The observed value h days after a forecast origin, divided by the series' recent average at the origin, so one model serves every series | match |  |
| validation | Rolling forecast origins with origin-safe features | Rolling forecast origins with origin-safe features and late-arriving feeds | match |  |
| metrics | Weighted pinball loss on hours; Overtime hours in simulation | Weighted absolute percentage error by horizon, forecast value added against a seasonal baseline and prediction-band coverage | match |  |
| data | Many time series with seasonality, calendar effects and late-arriving data | Many daily series with calendar effects, planned events, censored demand (stock-outs) and late feeds | match |  |
| model | Baseline: Hours = orders x fixed standard. Production: Order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optim… | Seasonal baseline against quantile gradient boosting | adapt | Replace the kit's models with the blueprint's: Order-driven workload model with learned productivity and quantile hours forecasts feeding the staf… |
| serving | Scheduled batch run | Offline backtest scripts only: no scheduled pipeline, publishing or reconciliation | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | No external system beyond the data source | None. Runs locally on synthetic retail-style demand | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
