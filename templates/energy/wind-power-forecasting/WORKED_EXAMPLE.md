# Wind Power Forecasting: worked example

> Run on synthetic data with `regression` engine, seed 1246, knobs {"n": 25220, "outlier_share": 0.04, "drift": 0.284}, in 5.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power.

**Constraints that shape the design.** 15-minute resolution for 72 hours ahead; Quantile output for ramps; Accounts for turbine availability and curtailment

**Label in this use case.** For "Wind Power Forecasting": Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Manufacturer curve only.

## 2. Choose the signals

Your strongest signal is **Wind forecast at hub height** (forecast speed and direction). Its rule: From weather models. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 13.11 to 1.49, which looks like a breakthrough and is leakage. A random split reports MAE 5.18 against 5.84 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.31; the boosted model 5.84, a gain of 29.7%. Its 80% interval covers 67.7% of outcomes. The hardest segment has an error 1.09 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.31 |
| MAE, boosted challenger | 5.84 |
| MAE gain over the baseline | 29.7% |
| 80% interval coverage | 67.7% |
| Worst segment versus overall MAE | 1.09x |
| RMSE with a leaky column versus honest | 1.49 vs 13.11 |

## 5. An edge case from the blueprint

**Storm cut-out.** turbines shut down at high wind. Planned response: Cut-out features and a storm flag. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Report error by segment and by time, never one global number, and keep the interval honest. Replace the synthetic table with your extract and keep the chronological split and the leakage test.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 25220 |
| `train_rows` | 17654 |
| `test_rows` | 7566 |
| `baseline_ridge.mae` | 8.3094 |
| `baseline_ridge.rmse` | 14.751 |
| `baseline_ridge.wape` | 0.15658 |
| `baseline_ridge.r2` | 0.36749 |
| `challenger_gbm.mae` | 5.842 |
| `challenger_gbm.rmse` | 13.106 |
| `challenger_gbm.wape` | 0.11008 |
| `challenger_gbm.r2` | 0.5007 |
| `mae_gain_vs_baseline` | 0.29694 |
| `interval_80_coverage` | 0.67698 |
| `interval_80_mean_width` | 9.8898 |
| `segment_mae.0` | 5.9836 |
| `segment_mae.1` | 5.4942 |
| `segment_mae.2` | 5.8863 |
| `segment_mae.3` | 6.349 |
| `worst_segment_vs_overall` | 1.0868 |
| `leaky_feature_rmse` | 1.4904 |
| `honest_rmse` | 13.106 |
| `random_split_mae` | 5.1824 |
| `chronological_mae` | 5.842 |

</details>
