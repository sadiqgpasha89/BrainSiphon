# Changeover Time Prediction: worked example

> Run on synthetic data with `regression` engine, seed 79089, knobs {"n": 20980, "outlier_share": 0.025, "drift": 0.167}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times.

**Constraints that shape the design.** Prediction within 3 s of a schedule query; Intervals reported; Results by product pair and machine

**Label in this use case.** For "Changeover Time Prediction": Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using stop time as changeover time.

## 2. Choose the signals

Your strongest signal is **Product pair attributes** (differences in tooling, material and colour or size). Its rule: From the product master. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.42 to 1.60, which looks like a breakthrough and is leakage. A random split reports MAE 4.20 against 4.54 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.13; the boosted model 4.54, a gain of 36.3%. Its 80% interval covers 72.4% of outcomes. The hardest segment has an error 1.46 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.13 |
| MAE, boosted challenger | 4.54 |
| MAE gain over the baseline | 36.3% |
| 80% interval coverage | 72.4% |
| Worst segment versus overall MAE | 1.46x |
| RMSE with a leaky column versus honest | 1.60 vs 10.42 |

## 5. An edge case from the blueprint

**New product pair.** the pair has never been run. Planned response: Use similar pairs and a wide interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20980 |
| `train_rows` | 14685 |
| `test_rows` | 6295 |
| `baseline_ridge.mae` | 7.1283 |
| `baseline_ridge.rmse` | 12.402 |
| `baseline_ridge.wape` | 0.13582 |
| `baseline_ridge.r2` | 0.40909 |
| `challenger_gbm.mae` | 4.5414 |
| `challenger_gbm.rmse` | 10.415 |
| `challenger_gbm.wape` | 0.08653 |
| `challenger_gbm.r2` | 0.58325 |
| `mae_gain_vs_baseline` | 0.36291 |
| `interval_80_coverage` | 0.72407 |
| `interval_80_mean_width` | 9.2357 |
| `segment_mae.0` | 4.5505 |
| `segment_mae.1` | 4.5239 |
| `segment_mae.2` | 3.8976 |
| `segment_mae.3` | 6.6168 |
| `worst_segment_vs_overall` | 1.457 |
| `leaky_feature_rmse` | 1.6035 |
| `honest_rmse` | 10.415 |
| `random_split_mae` | 4.2036 |
| `chronological_mae` | 4.5414 |

</details>
