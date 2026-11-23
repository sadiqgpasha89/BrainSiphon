# Quantity Takeoff from Drawings and Models: worked example

> Run on synthetic data with `regression` engine, seed 84110, knobs {"n": 20470, "outlier_share": 0.015, "drift": 0.287}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results.

**Constraints that shape the design.** Quantities link to model elements or drawing regions; Estimators confirm before use in a bid; Differences against the estimate flagged

**Label in this use case.** For "Quantity Takeoff from Drawings and Models": Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Unchecked scale.

## 2. Choose the signals

Your strongest signal is **Element quantities** (areas, volumes and counts). Its rule: From the model. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.26 to 1.77, which looks like a breakthrough and is leakage. A random split reports MAE 4.04 against 4.58 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.90; the boosted model 4.58, a gain of 33.6%. Its 80% interval covers 65.0% of outcomes. The hardest segment has an error 1.44 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.90 |
| MAE, boosted challenger | 4.58 |
| MAE gain over the baseline | 33.6% |
| 80% interval coverage | 65.0% |
| Worst segment versus overall MAE | 1.44x |
| RMSE with a leaky column versus honest | 1.77 vs 9.26 |

## 5. An edge case from the blueprint

**Incomplete model.** elements are missing. Planned response: Drawing-based fallback and gap report. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20470 |
| `train_rows` | 14329 |
| `test_rows` | 6141 |
| `baseline_ridge.mae` | 6.8966 |
| `baseline_ridge.rmse` | 11.458 |
| `baseline_ridge.wape` | 0.13013 |
| `baseline_ridge.r2` | 0.49514 |
| `challenger_gbm.mae` | 4.5785 |
| `challenger_gbm.rmse` | 9.2586 |
| `challenger_gbm.wape` | 0.086393 |
| `challenger_gbm.r2` | 0.67036 |
| `mae_gain_vs_baseline` | 0.33612 |
| `interval_80_coverage` | 0.64973 |
| `interval_80_mean_width` | 8.815 |
| `segment_mae.0` | 4.3238 |
| `segment_mae.1` | 4.7296 |
| `segment_mae.2` | 4.3852 |
| `segment_mae.3` | 6.577 |
| `worst_segment_vs_overall` | 1.4365 |
| `leaky_feature_rmse` | 1.7684 |
| `honest_rmse` | 9.2586 |
| `random_split_mae` | 4.041 |
| `chronological_mae` | 4.5785 |

</details>
