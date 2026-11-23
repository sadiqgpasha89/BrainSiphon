# Soft Sensor for Hard-to-Measure Quantities: worked example

> Run on synthetic data with `regression` engine, seed 77618, knobs {"n": 18510, "outlier_share": 0.035, "drift": 0.158}, in 4.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time.

**Constraints that shape the design.** Estimates with an uncertainty range; Lab values override the estimate when available; Drift detection with retraining triggers

**Label in this use case.** For "Soft Sensor for Hard-to-Measure Quantities": Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using sample time as process time.

## 2. Choose the signals

Your strongest signal is **Lagged process signals** (lagged temperature, flow and pressure features aligned to residence time). Its rule: Residence time from the process. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.43 to 1.57, which looks like a breakthrough and is leakage. A random split reports MAE 5.10 against 5.24 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.84; the boosted model 5.24, a gain of 33.1%. Its 80% interval covers 72.9% of outcomes. The hardest segment has an error 1.33 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.84 |
| MAE, boosted challenger | 5.24 |
| MAE gain over the baseline | 33.1% |
| 80% interval coverage | 72.9% |
| Worst segment versus overall MAE | 1.33x |
| RMSE with a leaky column versus honest | 1.57 vs 12.43 |

## 5. An edge case from the blueprint

**Process change.** the relation changes. Planned response: Drift alarm and a fallback to lab-only. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18510 |
| `train_rows` | 12957 |
| `test_rows` | 5553 |
| `baseline_ridge.mae` | 7.8364 |
| `baseline_ridge.rmse` | 14.117 |
| `baseline_ridge.wape` | 0.14754 |
| `baseline_ridge.r2` | 0.35535 |
| `challenger_gbm.mae` | 5.2403 |
| `challenger_gbm.rmse` | 12.43 |
| `challenger_gbm.wape` | 0.09866 |
| `challenger_gbm.r2` | 0.50019 |
| `mae_gain_vs_baseline` | 0.33129 |
| `interval_80_coverage` | 0.72862 |
| `interval_80_mean_width` | 9.7718 |
| `segment_mae.0` | 4.9335 |
| `segment_mae.1` | 5.1358 |
| `segment_mae.2` | 5.8677 |
| `segment_mae.3` | 6.9802 |
| `worst_segment_vs_overall` | 1.332 |
| `leaky_feature_rmse` | 1.5668 |
| `honest_rmse` | 12.43 |
| `random_split_mae` | 5.0957 |
| `chronological_mae` | 5.2403 |

</details>
