# Warranty Claim Prediction: worked example

> Run on synthetic data with `regression` engine, seed 8750, knobs {"n": 17530, "outlier_share": 0.033, "drift": 0.348}, in 4.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly.

**Constraints that shape the design.** Forecast by product and month in service; Intervals for finance reserves; Failure modes linked to build data

**Label in this use case.** For "Warranty Claim Prediction": Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using claims to date as final.

## 2. Choose the signals

Your strongest signal is **Units in service by age** (installed base by months in service). Its rule: From sales and registration. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.79 to 1.51, which looks like a breakthrough and is leakage. A random split reports MAE 5.03 against 5.50 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.69; the boosted model 5.50, a gain of 28.5%. Its 80% interval covers 65.8% of outcomes. The hardest segment has an error 1.47 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.69 |
| MAE, boosted challenger | 5.50 |
| MAE gain over the baseline | 28.5% |
| 80% interval coverage | 65.8% |
| Worst segment versus overall MAE | 1.47x |
| RMSE with a leaky column versus honest | 1.51 vs 11.79 |

## 5. An edge case from the blueprint

**Recall or campaign.** claims jump after a campaign starts. Planned response: Campaign flags and separate handling. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17530 |
| `train_rows` | 12271 |
| `test_rows` | 5259 |
| `baseline_ridge.mae` | 7.6902 |
| `baseline_ridge.rmse` | 13.399 |
| `baseline_ridge.wape` | 0.14444 |
| `baseline_ridge.r2` | 0.40961 |
| `challenger_gbm.mae` | 5.4958 |
| `challenger_gbm.rmse` | 11.787 |
| `challenger_gbm.wape` | 0.10322 |
| `challenger_gbm.r2` | 0.54316 |
| `mae_gain_vs_baseline` | 0.28535 |
| `interval_80_coverage` | 0.6583 |
| `interval_80_mean_width` | 9.8872 |
| `segment_mae.0` | 5.2793 |
| `segment_mae.1` | 5.2548 |
| `segment_mae.2` | 5.7878 |
| `segment_mae.3` | 8.0904 |
| `worst_segment_vs_overall` | 1.4721 |
| `leaky_feature_rmse` | 1.5056 |
| `honest_rmse` | 11.787 |
| `random_split_mae` | 5.0284 |
| `chronological_mae` | 5.4958 |

</details>
