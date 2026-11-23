# Fibre Fault Localisation from OTDR & Telemetry: worked example

> Run on synthetic data with `regression` engine, seed 13650, knobs {"n": 21140, "outlier_share": 0.016, "drift": 0.163}, in 5.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time.

**Constraints that shape the design.** Position estimate with an error range in metres; Combine OTDR with route records; Crew guidance within 10 minutes of the fault

**Label in this use case.** For "Fibre Fault Localisation from OTDR & Telemetry": Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using estimated locations as labels.

## 2. Choose the signals

Your strongest signal is **OTDR event distance** (optical distance to the first major loss event). Its rule: Needs refractive index calibration. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.07 to 1.56, which looks like a breakthrough and is leakage. A random split reports MAE 3.95 against 4.13 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.84; the boosted model 4.13, a gain of 39.7%. Its 80% interval covers 73.0% of outcomes. The hardest segment has an error 1.46 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.84 |
| MAE, boosted challenger | 4.13 |
| MAE gain over the baseline | 39.7% |
| 80% interval coverage | 73.0% |
| Worst segment versus overall MAE | 1.46x |
| RMSE with a leaky column versus honest | 1.56 vs 9.07 |

## 5. An edge case from the blueprint

**Multiple events.** the first event is not the cut. Planned response: Rank events using telemetry and past traces. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21140 |
| `train_rows` | 14797 |
| `test_rows` | 6343 |
| `baseline_ridge.mae` | 6.8422 |
| `baseline_ridge.rmse` | 11.253 |
| `baseline_ridge.wape` | 0.13018 |
| `baseline_ridge.r2` | 0.45981 |
| `challenger_gbm.mae` | 4.1292 |
| `challenger_gbm.rmse` | 9.0692 |
| `challenger_gbm.wape` | 0.078565 |
| `challenger_gbm.r2` | 0.64915 |
| `mae_gain_vs_baseline` | 0.39651 |
| `interval_80_coverage` | 0.72978 |
| `interval_80_mean_width` | 8.8806 |
| `segment_mae.0` | 3.9028 |
| `segment_mae.1` | 4.0519 |
| `segment_mae.2` | 4.3708 |
| `segment_mae.3` | 6.0129 |
| `worst_segment_vs_overall` | 1.4562 |
| `leaky_feature_rmse` | 1.5624 |
| `honest_rmse` | 9.0692 |
| `random_split_mae` | 3.9537 |
| `chronological_mae` | 4.1292 |

</details>
