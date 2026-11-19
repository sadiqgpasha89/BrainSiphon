# Deposit Run-Off Modelling: how well the starter fits

> Generated from the blueprint `bfsi/deposit-run-off-modelling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Back-test of run-off by segment" and "Coverage of the 95% quantile" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Multi-horizon forecasting: Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence | Multi-horizon forecasting | match |  |
| label | Future values of many series at several horizons | The observed value h days after a forecast origin, divided by the series' recent average at the origin, so one model serves every series | match |  |
| validation | Rolling forecast origins with origin-safe features | Rolling forecast origins with origin-safe features and late-arriving feeds | match |  |
| metrics | Back-test of run-off by segment; Coverage of the 95% quantile | Weighted absolute percentage error by horizon, forecast value added against a seasonal baseline and prediction-band coverage | adapt | Score "Back-test of run-off by segment" and "Coverage of the 95% quantile" instead of the kit metrics |
| data | Many time series with seasonality, calendar effects and late-arriving data | Many daily series with calendar effects, planned events, censored demand (stock-outs) and late feeds | match |  |
| model | Baseline: Regulatory run-off rates by deposit class, because they are the reference and are accepted by supervisors. Production: Survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, c… | Seasonal baseline against quantile gradient boosting | match |  |
| serving | Scheduled batch run | Offline backtest scripts only: no scheduled pipeline, publishing or reconciliation | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Deposit ledger (core banking extract); Customer features (Spark) | None. Runs locally on synthetic retail-style demand | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
