# Geotechnical Ground Risk Modelling: worked example

> Run on synthetic data with `regression` engine, seed 65728, knobs {"n": 21180, "outlier_share": 0.035, "drift": 0.397}, in 4.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule.

**Constraints that shape the design.** Maps show uncertainty; Geotechnical engineers review all outputs; Gaps in data highlighted

**Label in this use case.** For "Geotechnical Ground Risk Modelling": Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Single ground models.

## 2. Choose the signals

Your strongest signal is **Borehole logs** (soil and rock descriptions). Its rule: From investigations. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.47 to 1.40, which looks like a breakthrough and is leakage. A random split reports MAE 5.20 against 6.08 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.10; the boosted model 6.08, a gain of 24.9%. Its 80% interval covers 61.5% of outcomes. The hardest segment has an error 1.37 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.10 |
| MAE, boosted challenger | 6.08 |
| MAE gain over the baseline | 24.9% |
| 80% interval coverage | 61.5% |
| Worst segment versus overall MAE | 1.37x |
| RMSE with a leaky column versus honest | 1.40 vs 12.47 |

## 5. An edge case from the blueprint

**Sparse data.** few boreholes exist. Planned response: Wide uncertainty. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21180 |
| `train_rows` | 14825 |
| `test_rows` | 6355 |
| `baseline_ridge.mae` | 8.0988 |
| `baseline_ridge.rmse` | 14.028 |
| `baseline_ridge.wape` | 0.15116 |
| `baseline_ridge.r2` | 0.4219 |
| `challenger_gbm.mae` | 6.0817 |
| `challenger_gbm.rmse` | 12.471 |
| `challenger_gbm.wape` | 0.11351 |
| `challenger_gbm.r2` | 0.5431 |
| `mae_gain_vs_baseline` | 0.24907 |
| `interval_80_coverage` | 0.61511 |
| `interval_80_mean_width` | 10.05 |
| `segment_mae.0` | 6.1863 |
| `segment_mae.1` | 5.554 |
| `segment_mae.2` | 6.0338 |
| `segment_mae.3` | 8.342 |
| `worst_segment_vs_overall` | 1.3717 |
| `leaky_feature_rmse` | 1.4027 |
| `honest_rmse` | 12.471 |
| `random_split_mae` | 5.1951 |
| `chronological_mae` | 6.0817 |

</details>
