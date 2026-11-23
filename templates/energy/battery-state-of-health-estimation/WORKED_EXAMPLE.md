# Battery State of Health Estimation: worked example

> Run on synthetic data with `regression` engine, seed 78156, knobs {"n": 23220, "outlier_share": 0.012, "drift": 0.198}, in 5.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned.

**Constraints that shape the design.** Capacity estimate with an interval; Works from partial cycles; Alerts for accelerated ageing

**Label in this use case.** For "Battery State of Health Estimation": Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Vendor estimate only.

## 2. Choose the signals

Your strongest signal is **Capacity from partial charge** (capacity inferred from partial cycles). Its rule: Normalised. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 7.31 to 1.61, which looks like a breakthrough and is leakage. A random split reports MAE 3.56 against 3.78 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.40; the boosted model 3.78, a gain of 41.0%. Its 80% interval covers 71.6% of outcomes. The hardest segment has an error 1.34 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.40 |
| MAE, boosted challenger | 3.78 |
| MAE gain over the baseline | 41.0% |
| 80% interval coverage | 71.6% |
| Worst segment versus overall MAE | 1.34x |
| RMSE with a leaky column versus honest | 1.61 vs 7.31 |

## 5. An edge case from the blueprint

**Sensor drift.** voltage or current readings are wrong. Planned response: Cross-checks and calibration. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 23220 |
| `train_rows` | 16253 |
| `test_rows` | 6967 |
| `baseline_ridge.mae` | 6.3978 |
| `baseline_ridge.rmse` | 9.838 |
| `baseline_ridge.wape` | 0.12155 |
| `baseline_ridge.r2` | 0.53462 |
| `challenger_gbm.mae` | 3.7769 |
| `challenger_gbm.rmse` | 7.3075 |
| `challenger_gbm.wape` | 0.071757 |
| `challenger_gbm.r2` | 0.74323 |
| `mae_gain_vs_baseline` | 0.40966 |
| `interval_80_coverage` | 0.71609 |
| `interval_80_mean_width` | 8.8046 |
| `segment_mae.0` | 3.7467 |
| `segment_mae.1` | 3.4509 |
| `segment_mae.2` | 4.0991 |
| `segment_mae.3` | 5.0547 |
| `worst_segment_vs_overall` | 1.3383 |
| `leaky_feature_rmse` | 1.6149 |
| `honest_rmse` | 7.3075 |
| `random_split_mae` | 3.5579 |
| `chronological_mae` | 3.7769 |

</details>
