# Vegetation Encroachment Detection: worked example

> Run on synthetic data with `regression` engine, seed 33108, knobs {"n": 25220, "outlier_share": 0.035, "drift": 0.174}, in 5.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters.

**Constraints that shape the design.** Clearance estimates with an uncertainty; Priority by growth rate and local wind and fire risk; Arborist confirms before trimming

**Label in this use case.** For "Vegetation Encroachment Detection": Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed cycles only.

## 2. Choose the signals

Your strongest signal is **Clearance distance** (distance from canopy to conductor). Its rule: From lidar or imagery. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.97 to 1.48, which looks like a breakthrough and is leakage. A random split reports MAE 5.07 against 5.47 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.12; the boosted model 5.47, a gain of 32.7%. Its 80% interval covers 72.1% of outcomes. The hardest segment has an error 1.10 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.12 |
| MAE, boosted challenger | 5.47 |
| MAE gain over the baseline | 32.7% |
| 80% interval coverage | 72.1% |
| Worst segment versus overall MAE | 1.10x |
| RMSE with a leaky column versus honest | 1.48 vs 12.97 |

## 5. An edge case from the blueprint

**Dense canopy.** lidar misses the lower tree. Planned response: Multi-source checks and field samples. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25220 |
| `train_rows` | 17654 |
| `test_rows` | 7566 |
| `baseline_ridge.mae` | 8.1243 |
| `baseline_ridge.rmse` | 14.655 |
| `baseline_ridge.wape` | 0.15349 |
| `baseline_ridge.r2` | 0.33744 |
| `challenger_gbm.mae` | 5.4666 |
| `challenger_gbm.rmse` | 12.967 |
| `challenger_gbm.wape` | 0.10328 |
| `challenger_gbm.r2` | 0.48127 |
| `mae_gain_vs_baseline` | 0.32713 |
| `interval_80_coverage` | 0.72112 |
| `interval_80_mean_width` | 9.656 |
| `segment_mae.0` | 5.3077 |
| `segment_mae.1` | 5.6405 |
| `segment_mae.2` | 5.486 |
| `segment_mae.3` | 5.9921 |
| `worst_segment_vs_overall` | 1.0961 |
| `leaky_feature_rmse` | 1.4765 |
| `honest_rmse` | 12.967 |
| `random_split_mae` | 5.0723 |
| `chronological_mae` | 5.4666 |

</details>
