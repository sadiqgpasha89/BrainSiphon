# LTV-Based Bidding: worked example

> Run on synthetic data with `regression` engine, seed 46352, knobs {"n": 23250, "outlier_share": 0.018, "drift": 0.226}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth.

**Constraints that shape the design.** Early LTV signal within days; Calibration by cohort; Privacy

**Label in this use case.** For "LTV-Based Bidding": Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Immature labels in evaluation.

## 2. Choose the signals

Your strongest signal is **First-week engagement** (sessions and purchases in 7 days). Its rule: Window. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.18 to 1.50, which looks like a breakthrough and is leakage. A random split reports MAE 3.94 against 4.37 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.91; the boosted model 4.37, a gain of 36.8%. Its 80% interval covers 68.6% of outcomes. The hardest segment has an error 1.28 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.91 |
| MAE, boosted challenger | 4.37 |
| MAE gain over the baseline | 36.8% |
| 80% interval coverage | 68.6% |
| Worst segment versus overall MAE | 1.28x |
| RMSE with a leaky column versus honest | 1.50 vs 9.18 |

## 5. An edge case from the blueprint

**Seasonal acquisition cohorts have different value.** LTV predictions drift. Planned response: Seasonality features and cohort calibration. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 23250 |
| `train_rows` | 16274 |
| `test_rows` | 6976 |
| `baseline_ridge.mae` | 6.9111 |
| `baseline_ridge.rmse` | 11.35 |
| `baseline_ridge.wape` | 0.13169 |
| `baseline_ridge.r2` | 0.47101 |
| `challenger_gbm.mae` | 4.3709 |
| `challenger_gbm.rmse` | 9.1811 |
| `challenger_gbm.wape` | 0.083287 |
| `challenger_gbm.r2` | 0.65386 |
| `mae_gain_vs_baseline` | 0.36756 |
| `interval_80_coverage` | 0.68592 |
| `interval_80_mean_width` | 8.9993 |
| `segment_mae.0` | 4.362 |
| `segment_mae.1` | 4.1507 |
| `segment_mae.2` | 4.4485 |
| `segment_mae.3` | 5.5849 |
| `worst_segment_vs_overall` | 1.2777 |
| `leaky_feature_rmse` | 1.5014 |
| `honest_rmse` | 9.1811 |
| `random_split_mae` | 3.9351 |
| `chronological_mae` | 4.3709 |

</details>
