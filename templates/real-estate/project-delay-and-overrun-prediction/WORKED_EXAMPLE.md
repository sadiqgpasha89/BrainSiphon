# Construction Project Delay & Overrun Prediction: worked example

> Run on synthetic data with `regression` engine, seed 44750, knobs {"n": 21880, "outlier_share": 0.03, "drift": 0.198}, in 3.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early.

**Constraints that shape the design.** Forecasts refreshed weekly for every active project; Each forecast shows the drivers behind it; No scoring of individual people or blame

**Label in this use case.** For "Construction Project Delay & Overrun Prediction": Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Only completed projects are in the data, so cancelled or abandoned ones are missing.

## 2. Choose the signals

Your strongest signal is **Schedule performance index** (earned value divided by planned value to date). Its rule: Depends on honest progress reporting, so cross-check with quantities. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.96 to 1.49, which looks like a breakthrough and is leakage. A random split reports MAE 4.74 against 5.12 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.68; the boosted model 5.12, a gain of 33.4%. Its 80% interval covers 71.1% of outcomes. The hardest segment has an error 1.25 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.68 |
| MAE, boosted challenger | 5.12 |
| MAE gain over the baseline | 33.4% |
| 80% interval coverage | 71.1% |
| Worst segment versus overall MAE | 1.25x |
| RMSE with a leaky column versus honest | 1.49 vs 11.96 |

## 5. An edge case from the blueprint

**Change orders.** Change orders add scope and cost beyond the original plan. Planned response: Flag projects with frequent change orders and add them to the forecast. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21880 |
| `train_rows` | 15315 |
| `test_rows` | 6565 |
| `baseline_ridge.mae` | 7.6845 |
| `baseline_ridge.rmse` | 13.728 |
| `baseline_ridge.wape` | 0.14485 |
| `baseline_ridge.r2` | 0.36645 |
| `challenger_gbm.mae` | 5.1191 |
| `challenger_gbm.rmse` | 11.959 |
| `challenger_gbm.wape` | 0.09649 |
| `challenger_gbm.r2` | 0.5192 |
| `mae_gain_vs_baseline` | 0.33384 |
| `interval_80_coverage` | 0.71059 |
| `interval_80_mean_width` | 9.6009 |
| `segment_mae.0` | 4.9618 |
| `segment_mae.1` | 5.1814 |
| `segment_mae.2` | 5.0827 |
| `segment_mae.3` | 6.4163 |
| `worst_segment_vs_overall` | 1.2534 |
| `leaky_feature_rmse` | 1.4881 |
| `honest_rmse` | 11.959 |
| `random_split_mae` | 4.7375 |
| `chronological_mae` | 5.1191 |

</details>
