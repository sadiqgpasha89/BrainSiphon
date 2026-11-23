# Corrosion and Remaining Life Prediction: worked example

> Run on synthetic data with `regression` engine, seed 77930, knobs {"n": 21290, "outlier_share": 0.024, "drift": 0.324}, in 4.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins.

**Constraints that shape the design.** Remaining life shown as a range; Inspection intervals never exceed code limits; Engineers approve interval changes

**Label in this use case.** For "Corrosion and Remaining Life Prediction": Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: One reading rates.

## 2. Choose the signals

Your strongest signal is **Thickness readings over time** (wall thickness history). Its rule: From inspections. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.06 to 1.46, which looks like a breakthrough and is leakage. A random split reports MAE 4.57 against 5.22 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.60; the boosted model 5.22, a gain of 31.3%. Its 80% interval covers 64.8% of outcomes. The hardest segment has an error 1.19 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.60 |
| MAE, boosted challenger | 5.22 |
| MAE gain over the baseline | 31.3% |
| 80% interval coverage | 64.8% |
| Worst segment versus overall MAE | 1.19x |
| RMSE with a leaky column versus honest | 1.46 vs 11.06 |

## 5. An edge case from the blueprint

**Localised pitting.** average thickness hides deep pits. Planned response: Pit-depth models. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21290 |
| `train_rows` | 14902 |
| `test_rows` | 6388 |
| `baseline_ridge.mae` | 7.6013 |
| `baseline_ridge.rmse` | 12.982 |
| `baseline_ridge.wape` | 0.14428 |
| `baseline_ridge.r2` | 0.43835 |
| `challenger_gbm.mae` | 5.2229 |
| `challenger_gbm.rmse` | 11.058 |
| `challenger_gbm.wape` | 0.099136 |
| `challenger_gbm.r2` | 0.59247 |
| `mae_gain_vs_baseline` | 0.31289 |
| `interval_80_coverage` | 0.64825 |
| `interval_80_mean_width` | 9.3959 |
| `segment_mae.0` | 5.1803 |
| `segment_mae.1` | 5.1249 |
| `segment_mae.2` | 5.2477 |
| `segment_mae.3` | 6.2155 |
| `worst_segment_vs_overall` | 1.19 |
| `leaky_feature_rmse` | 1.4567 |
| `honest_rmse` | 11.058 |
| `random_split_mae` | 4.5723 |
| `chronological_mae` | 5.2229 |

</details>
