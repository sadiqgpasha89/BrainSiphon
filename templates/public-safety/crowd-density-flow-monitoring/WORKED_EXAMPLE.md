# Crowd Density and Flow Monitoring: worked example

> Run on synthetic data with `regression` engine, seed 31727, knobs {"n": 17730, "outlier_share": 0.04, "drift": 0.256}, in 4.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous.

**Constraints that shape the design.** Density estimates every 10 s; Thresholds set by safety planners; Counts only with no identity

**Label in this use case.** For "Crowd Density and Flow Monitoring": Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Identification of people.

## 2. Choose the signals

Your strongest signal is **Density per zone** (estimated people per square metre). Its rule: From vision. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 13.82 to 1.43, which looks like a breakthrough and is leakage. A random split reports MAE 5.22 against 6.02 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.54; the boosted model 6.02, a gain of 29.5%. Its 80% interval covers 69.2% of outcomes. The hardest segment has an error 1.10 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.54 |
| MAE, boosted challenger | 6.02 |
| MAE gain over the baseline | 29.5% |
| 80% interval coverage | 69.2% |
| Worst segment versus overall MAE | 1.10x |
| RMSE with a leaky column versus honest | 1.43 vs 13.82 |

## 5. An edge case from the blueprint

**Occlusion.** people hide each other. Planned response: Multi-camera fusion. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17730 |
| `train_rows` | 12411 |
| `test_rows` | 5319 |
| `baseline_ridge.mae` | 8.5393 |
| `baseline_ridge.rmse` | 15.457 |
| `baseline_ridge.wape` | 0.16028 |
| `baseline_ridge.r2` | 0.34611 |
| `challenger_gbm.mae` | 6.0194 |
| `challenger_gbm.rmse` | 13.817 |
| `challenger_gbm.wape` | 0.11298 |
| `challenger_gbm.r2` | 0.47748 |
| `mae_gain_vs_baseline` | 0.29509 |
| `interval_80_coverage` | 0.69224 |
| `interval_80_mean_width` | 10.273 |
| `segment_mae.0` | 5.7155 |
| `segment_mae.1` | 6.6416 |
| `segment_mae.2` | 5.7082 |
| `segment_mae.3` | 6.1393 |
| `worst_segment_vs_overall` | 1.1034 |
| `leaky_feature_rmse` | 1.4253 |
| `honest_rmse` | 13.817 |
| `random_split_mae` | 5.2198 |
| `chronological_mae` | 6.0194 |

</details>
