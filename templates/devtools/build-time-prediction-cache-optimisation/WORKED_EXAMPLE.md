# Build Time Prediction and Cache Optimisation: worked example

> Run on synthetic data with `regression` engine, seed 26173, knobs {"n": 20510, "outlier_share": 0.017, "drift": 0.168}, in 5.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely.

**Constraints that shape the design.** Prediction within 15% for 80% of builds; Cache changes never alter build outputs; Owners approve configuration changes

**Label in this use case.** For "Build Time Prediction and Cache Optimisation": Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Speed at any cost.

## 2. Choose the signals

Your strongest signal is **Target duration history** (time per build target). Its rule: From build tools. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.72 to 1.44, which looks like a breakthrough and is leakage. A random split reports MAE 3.92 against 4.05 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.73; the boosted model 4.05, a gain of 39.9%. Its 80% interval covers 71.3% of outcomes. The hardest segment has an error 1.37 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.73 |
| MAE, boosted challenger | 4.05 |
| MAE gain over the baseline | 39.9% |
| 80% interval coverage | 71.3% |
| Worst segment versus overall MAE | 1.37x |
| RMSE with a leaky column versus honest | 1.44 vs 8.72 |

## 5. An edge case from the blueprint

**Non-hermetic builds.** cache keys miss inputs. Planned response: Hermeticity checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20510 |
| `train_rows` | 14356 |
| `test_rows` | 6154 |
| `baseline_ridge.mae` | 6.7325 |
| `baseline_ridge.rmse` | 11.005 |
| `baseline_ridge.wape` | 0.12761 |
| `baseline_ridge.r2` | 0.47394 |
| `challenger_gbm.mae` | 4.0453 |
| `challenger_gbm.rmse` | 8.7204 |
| `challenger_gbm.wape` | 0.076677 |
| `challenger_gbm.r2` | 0.66969 |
| `mae_gain_vs_baseline` | 0.39914 |
| `interval_80_coverage` | 0.71303 |
| `interval_80_mean_width` | 8.7904 |
| `segment_mae.0` | 3.9412 |
| `segment_mae.1` | 4.0606 |
| `segment_mae.2` | 3.8963 |
| `segment_mae.3` | 5.5262 |
| `worst_segment_vs_overall` | 1.3661 |
| `leaky_feature_rmse` | 1.4421 |
| `honest_rmse` | 8.7204 |
| `random_split_mae` | 3.9161 |
| `chronological_mae` | 4.0453 |

</details>
