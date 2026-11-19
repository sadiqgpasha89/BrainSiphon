# Customer Lifetime Value Prediction: worked example

> Run on synthetic data with `regression` engine, seed 78234, knobs {"n": 23330, "outlier_share": 0.015, "drift": 0.205}, in 2.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers.

**Constraints that shape the design.** Calibrated across cohorts; Refresh weekly; Used in bid decisions so must not leak cost data

**Label in this use case.** For "Customer Lifetime Value Prediction": Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using full-history features for young customers.

## 2. Choose the signals

Your strongest signal is **Early-life activity** (transactions and balances in the first 30 days). Its rule: Fixed observation window per customer. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.37 to 1.87, which looks like a breakthrough and is leakage. A random split reports MAE 3.91 against 4.29 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.87; the boosted model 4.29, a gain of 37.6%. Its 80% interval covers 69.9% of outcomes. The hardest segment has an error 1.32 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.87 |
| MAE, boosted challenger | 4.29 |
| MAE gain over the baseline | 37.6% |
| 80% interval coverage | 69.9% |
| Worst segment versus overall MAE | 1.32x |
| RMSE with a leaky column versus honest | 1.87 vs 9.37 |

## 5. An edge case from the blueprint

**Product launch changes value drivers.** model underestimates new product customers. Planned response: Segment-level monitor with fast retrain triggers. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 23330 |
| `train_rows` | 16330 |
| `test_rows` | 7000 |
| `baseline_ridge.mae` | 6.8717 |
| `baseline_ridge.rmse` | 11.552 |
| `baseline_ridge.wape` | 0.12976 |
| `baseline_ridge.r2` | 0.46981 |
| `challenger_gbm.mae` | 4.2875 |
| `challenger_gbm.rmse` | 9.3693 |
| `challenger_gbm.wape` | 0.080965 |
| `challenger_gbm.r2` | 0.65123 |
| `mae_gain_vs_baseline` | 0.37606 |
| `interval_80_coverage` | 0.699 |
| `interval_80_mean_width` | 8.7037 |
| `segment_mae.0` | 4.2828 |
| `segment_mae.1` | 4.0406 |
| `segment_mae.2` | 4.3368 |
| `segment_mae.3` | 5.6755 |
| `worst_segment_vs_overall` | 1.3237 |
| `leaky_feature_rmse` | 1.8655 |
| `honest_rmse` | 9.3693 |
| `random_split_mae` | 3.9109 |
| `chronological_mae` | 4.2875 |

</details>
