# Mobile Retention & ROAS Prediction: worked example

> Run on synthetic data with `regression` engine, seed 65040, knobs {"n": 17490, "outlier_share": 0.015, "drift": 0.3}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets.

**Constraints that shape the design.** Cohorts with limited maturity; Platform privacy aggregation; Daily budget decisions

**Label in this use case.** For "Mobile Retention & ROAS Prediction": Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Early curves extrapolated beyond observed range.

## 2. Choose the signals

Your strongest signal is **Day-1 and day-3 retention** (early retention). Its rule: Cohort windows. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.29 to 1.87, which looks like a breakthrough and is leakage. A random split reports MAE 4.09 against 4.63 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.95; the boosted model 4.63, a gain of 33.3%. Its 80% interval covers 63.3% of outcomes. The hardest segment has an error 1.16 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.95 |
| MAE, boosted challenger | 4.63 |
| MAE gain over the baseline | 33.3% |
| 80% interval coverage | 63.3% |
| Worst segment versus overall MAE | 1.16x |
| RMSE with a leaky column versus honest | 1.87 vs 9.29 |

## 5. An edge case from the blueprint

**Game update changes monetisation.** curves shift abruptly. Planned response: Version-aware cohorts and change-point detection. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17490 |
| `train_rows` | 12243 |
| `test_rows` | 5247 |
| `baseline_ridge.mae` | 6.9461 |
| `baseline_ridge.rmse` | 11.459 |
| `baseline_ridge.wape` | 0.13118 |
| `baseline_ridge.r2` | 0.49439 |
| `challenger_gbm.mae` | 4.6316 |
| `challenger_gbm.rmse` | 9.2948 |
| `challenger_gbm.wape` | 0.08747 |
| `challenger_gbm.r2` | 0.66735 |
| `mae_gain_vs_baseline` | 0.33322 |
| `interval_80_coverage` | 0.63312 |
| `interval_80_mean_width` | 8.6966 |
| `segment_mae.0` | 4.5123 |
| `segment_mae.1` | 4.5183 |
| `segment_mae.2` | 5.0033 |
| `segment_mae.3` | 5.3818 |
| `worst_segment_vs_overall` | 1.162 |
| `leaky_feature_rmse` | 1.8735 |
| `honest_rmse` | 9.2948 |
| `random_split_mae` | 4.0945 |
| `chronological_mae` | 4.6316 |

</details>
