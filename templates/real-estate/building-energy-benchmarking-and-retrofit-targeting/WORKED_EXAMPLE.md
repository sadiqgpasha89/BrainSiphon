# Building Energy Benchmarking & Retrofit Targeting: worked example

> Run on synthetic data with `regression` engine, seed 84018, knobs {"n": 25610, "outlier_share": 0.029, "drift": 0.235}, in 2.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Benchmark building energy use against peers and rank buildings for retrofit by savings and payback.

**Constraints that shape the design.** Energy use normalised for weather and occupancy before any comparison; Peer groups defined so that like buildings compare with like; Calculations traceable so a building owner or auditor can reproduce them

**Label in this use case.** For "Building Energy Benchmarking & Retrofit Targeting": Benchmark building energy use against peers and rank buildings for retrofit by savings and payback. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones.

## 2. Choose the signals

Your strongest signal is **Normalised EUI** (annual kilowatt-hours per square metre after weather and occupancy adjustment). Its rule: Area definitions differ, so use the standard gross internal area. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.66 to 1.55, which looks like a breakthrough and is leakage. A random split reports MAE 4.81 against 5.16 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.60; the boosted model 5.16, a gain of 32.1%. Its 80% interval covers 69.1% of outcomes. The hardest segment has an error 1.34 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.60 |
| MAE, boosted challenger | 5.16 |
| MAE gain over the baseline | 32.1% |
| 80% interval coverage | 69.1% |
| Worst segment versus overall MAE | 1.34x |
| RMSE with a leaky column versus honest | 1.55 vs 11.66 |

## 5. An edge case from the blueprint

**Missing meters.** Missing meters leave gaps in the energy record. Planned response: Impute carefully from sub-meters or similar buildings and flag them. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25610 |
| `train_rows` | 17927 |
| `test_rows` | 7683 |
| `baseline_ridge.mae` | 7.5995 |
| `baseline_ridge.rmse` | 13.439 |
| `baseline_ridge.wape` | 0.14287 |
| `baseline_ridge.r2` | 0.41102 |
| `challenger_gbm.mae` | 5.1563 |
| `challenger_gbm.rmse` | 11.664 |
| `challenger_gbm.wape` | 0.096937 |
| `challenger_gbm.r2` | 0.55638 |
| `mae_gain_vs_baseline` | 0.32149 |
| `interval_80_coverage` | 0.6914 |
| `interval_80_mean_width` | 9.3377 |
| `segment_mae.0` | 4.8883 |
| `segment_mae.1` | 5.2064 |
| `segment_mae.2` | 5.3815 |
| `segment_mae.3` | 6.9132 |
| `worst_segment_vs_overall` | 1.3407 |
| `leaky_feature_rmse` | 1.5534 |
| `honest_rmse` | 11.664 |
| `random_split_mae` | 4.8109 |
| `chronological_mae` | 5.1563 |

</details>
