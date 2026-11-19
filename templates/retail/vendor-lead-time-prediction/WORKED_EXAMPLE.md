# Vendor Lead-Time Prediction: worked example

> Run on synthetic data with `regression` engine, seed 73430, knobs {"n": 19330, "outlier_share": 0.023, "drift": 0.356}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs.

**Constraints that shape the design.** Sparse history for new vendors; Disruption events; Weekly refresh

**Label in this use case.** For "Vendor Lead-Time Prediction": Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using received dates for undelivered open orders.

## 2. Choose the signals

Your strongest signal is **Vendor on-time history** (rolling on-time rate and variance). Its rule: Window before PO date. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.39 to 1.54, which looks like a breakthrough and is leakage. A random split reports MAE 4.45 against 5.16 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.47; the boosted model 5.16, a gain of 31.0%. Its 80% interval covers 62.6% of outcomes. The hardest segment has an error 1.18 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.47 |
| MAE, boosted challenger | 5.16 |
| MAE gain over the baseline | 31.0% |
| 80% interval coverage | 62.6% |
| Worst segment versus overall MAE | 1.18x |
| RMSE with a leaky column versus honest | 1.54 vs 10.39 |

## 5. An edge case from the blueprint

**Port strike.** lead times jump suddenly. Planned response: Disruption feeds and manual override. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19330 |
| `train_rows` | 13531 |
| `test_rows` | 5799 |
| `baseline_ridge.mae` | 7.4747 |
| `baseline_ridge.rmse` | 12.366 |
| `baseline_ridge.wape` | 0.14088 |
| `baseline_ridge.r2` | 0.45989 |
| `challenger_gbm.mae` | 5.1573 |
| `challenger_gbm.rmse` | 10.393 |
| `challenger_gbm.wape` | 0.097204 |
| `challenger_gbm.r2` | 0.61851 |
| `mae_gain_vs_baseline` | 0.31004 |
| `interval_80_coverage` | 0.62614 |
| `interval_80_mean_width` | 9.0024 |
| `segment_mae.0` | 5.0332 |
| `segment_mae.1` | 5.3103 |
| `segment_mae.2` | 4.9582 |
| `segment_mae.3` | 6.0644 |
| `worst_segment_vs_overall` | 1.1759 |
| `leaky_feature_rmse` | 1.5362 |
| `honest_rmse` | 10.393 |
| `random_split_mae` | 4.4477 |
| `chronological_mae` | 5.1573 |

</details>
