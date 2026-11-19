# Property Tax Assessment Anomaly Detection: worked example

> Run on synthetic data with `regression` engine, seed 72617, knobs {"n": 16080, "outlier_share": 0.037, "drift": 0.166}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk.

**Constraints that shape the design.** Assessments are equitable across areas and property types; Each flagged anomaly has an explanation an assessor can check; The owner's right to appeal is unaffected

**Label in this use case.** For "Property Tax Assessment Anomaly Detection": Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Sales selection, since sales are not a random sample of properties.

## 2. Choose the signals

Your strongest signal is **Assessment ratio** (assessed value divided by the adjusted sale price for recent sales). Its rule: Few sales in an area give noisy ratios. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.38 to 1.63, which looks like a breakthrough and is leakage. A random split reports MAE 5.34 against 5.25 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.83; the boosted model 5.25, a gain of 32.9%. Its 80% interval covers 72.7% of outcomes. The hardest segment has an error 1.39 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.83 |
| MAE, boosted challenger | 5.25 |
| MAE gain over the baseline | 32.9% |
| 80% interval coverage | 72.7% |
| Worst segment versus overall MAE | 1.39x |
| RMSE with a leaky column versus honest | 1.63 vs 12.38 |

## 5. An edge case from the blueprint

**Few sales.** Few sales in an area leave the expected value uncertain. Planned response: Use wider intervals or pool nearby areas. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16080 |
| `train_rows` | 11256 |
| `test_rows` | 4824 |
| `baseline_ridge.mae` | 7.8251 |
| `baseline_ridge.rmse` | 14.058 |
| `baseline_ridge.wape` | 0.14722 |
| `baseline_ridge.r2` | 0.36083 |
| `challenger_gbm.mae` | 5.2475 |
| `challenger_gbm.rmse` | 12.376 |
| `challenger_gbm.wape` | 0.098728 |
| `challenger_gbm.r2` | 0.50465 |
| `mae_gain_vs_baseline` | 0.3294 |
| `interval_80_coverage` | 0.72699 |
| `interval_80_mean_width` | 9.9554 |
| `segment_mae.0` | 5.2096 |
| `segment_mae.1` | 4.871 |
| `segment_mae.2` | 5.4841 |
| `segment_mae.3` | 7.3126 |
| `worst_segment_vs_overall` | 1.3935 |
| `leaky_feature_rmse` | 1.6276 |
| `honest_rmse` | 12.376 |
| `random_split_mae` | 5.3386 |
| `chronological_mae` | 5.2475 |

</details>
