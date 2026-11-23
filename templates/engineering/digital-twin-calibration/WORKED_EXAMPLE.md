# Digital Twin Calibration: worked example

> Run on synthetic data with `regression` engine, seed 29739, knobs {"n": 16120, "outlier_share": 0.021, "drift": 0.182}, in 4.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions.

**Constraints that shape the design.** Model error reported against measurements; Decisions flagged when error exceeds a limit; Engineers approve recalibration

**Label in this use case.** For "Digital Twin Calibration": Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Realism as validity.

## 2. Choose the signals

Your strongest signal is **Model versus measurement error** (residuals). Its rule: From sensors and model. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 10.01 to 1.54, which looks like a breakthrough and is leakage. A random split reports MAE 4.27 against 4.57 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.23; the boosted model 4.57, a gain of 36.7%. Its 80% interval covers 70.4% of outcomes. The hardest segment has an error 1.32 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.23 |
| MAE, boosted challenger | 4.57 |
| MAE gain over the baseline | 36.7% |
| 80% interval coverage | 70.4% |
| Worst segment versus overall MAE | 1.32x |
| RMSE with a leaky column versus honest | 1.54 vs 10.01 |

## 5. An edge case from the blueprint

**Drift absorbs a fault.** calibration hides damage. Planned response: Residual analysis by component. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16120 |
| `train_rows` | 11284 |
| `test_rows` | 4836 |
| `baseline_ridge.mae` | 7.2283 |
| `baseline_ridge.rmse` | 12.192 |
| `baseline_ridge.wape` | 0.13633 |
| `baseline_ridge.r2` | 0.44195 |
| `challenger_gbm.mae` | 4.5734 |
| `challenger_gbm.rmse` | 10.013 |
| `challenger_gbm.wape` | 0.086259 |
| `challenger_gbm.r2` | 0.6236 |
| `mae_gain_vs_baseline` | 0.36729 |
| `interval_80_coverage` | 0.7043 |
| `interval_80_mean_width` | 9.1871 |
| `segment_mae.0` | 4.6352 |
| `segment_mae.1` | 4.3798 |
| `segment_mae.2` | 4.2309 |
| `segment_mae.3` | 6.0427 |
| `worst_segment_vs_overall` | 1.3213 |
| `leaky_feature_rmse` | 1.5404 |
| `honest_rmse` | 10.013 |
| `random_split_mae` | 4.265 |
| `chronological_mae` | 4.5734 |

</details>
