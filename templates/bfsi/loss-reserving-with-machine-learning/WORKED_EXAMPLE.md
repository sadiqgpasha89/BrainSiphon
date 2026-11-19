# Loss Reserving with Machine Learning: worked example

> Run on synthetic data with `regression` engine, seed 52665, knobs {"n": 19370, "outlier_share": 0.018, "drift": 0.248}, in 3.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves.

**Constraints that shape the design.** Reconcile with actuarial chain-ladder; Uncertainty intervals required; Quarterly sign-off

**Label in this use case.** For "Loss Reserving with Machine Learning": Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final data in back-test.

## 2. Choose the signals

Your strongest signal is **Development factors** (incremental payments ratio). Its rule: Volatile at long tails. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.18 to 1.59, which looks like a breakthrough and is leakage. A random split reports MAE 3.95 against 4.42 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.95; the boosted model 4.42, a gain of 36.3%. Its 80% interval covers 67.5% of outcomes. The hardest segment has an error 1.35 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.95 |
| MAE, boosted challenger | 4.42 |
| MAE gain over the baseline | 36.3% |
| 80% interval coverage | 67.5% |
| Worst segment versus overall MAE | 1.35x |
| RMSE with a leaky column versus honest | 1.59 vs 9.18 |

## 5. An edge case from the blueprint

**Large loss.** One large claim dominates the triangle and distorts the estimate. Planned response: Separate large losses and model them on their own with a different method. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19370 |
| `train_rows` | 13559 |
| `test_rows` | 5811 |
| `baseline_ridge.mae` | 6.9476 |
| `baseline_ridge.rmse` | 11.395 |
| `baseline_ridge.wape` | 0.13097 |
| `baseline_ridge.r2` | 0.47639 |
| `challenger_gbm.mae` | 4.4229 |
| `challenger_gbm.rmse` | 9.1833 |
| `challenger_gbm.wape` | 0.083374 |
| `challenger_gbm.r2` | 0.65994 |
| `mae_gain_vs_baseline` | 0.3634 |
| `interval_80_coverage` | 0.67458 |
| `interval_80_mean_width` | 8.8953 |
| `segment_mae.0` | 4.2409 |
| `segment_mae.1` | 4.5326 |
| `segment_mae.2` | 4.2719 |
| `segment_mae.3` | 5.9747 |
| `worst_segment_vs_overall` | 1.3509 |
| `leaky_feature_rmse` | 1.5886 |
| `honest_rmse` | 9.1833 |
| `random_split_mae` | 3.9489 |
| `chronological_mae` | 4.4229 |

</details>
