# Flood & Climate Risk Scoring for Properties: worked example

> Run on synthetic data with `regression` engine, seed 69802, knobs {"n": 21570, "outlier_share": 0.026, "drift": 0.283}, in 3.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.

**Constraints that shape the design.** Methodology published so that users can judge and challenge a score; Every score names the climate scenario and the time horizon; Uncertainty ranges shown alongside the score

**Label in this use case.** For "Flood & Climate Risk Scoring for Properties": Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Claims come from a few events, so models fit those events and miss others.

## 2. Choose the signals

Your strongest signal is **Elevation above river** (metres between the lowest floor and the 100-year flood level from LiDAR data). Its rule: LiDAR resolution and age limit precision. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.51 to 1.74, which looks like a breakthrough and is leakage. A random split reports MAE 4.51 against 5.27 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.75; the boosted model 5.27, a gain of 32.0%. Its 80% interval covers 65.8% of outcomes. The hardest segment has an error 1.30 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.75 |
| MAE, boosted challenger | 5.27 |
| MAE gain over the baseline | 32.0% |
| 80% interval coverage | 65.8% |
| Worst segment versus overall MAE | 1.30x |
| RMSE with a leaky column versus honest | 1.74 vs 11.51 |

## 5. An edge case from the blueprint

**New defences.** New flood defences change the risk but the hazard maps lag. Planned response: Update the hazard layers when defences are completed and mark the date. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21570 |
| `train_rows` | 15098 |
| `test_rows` | 6472 |
| `baseline_ridge.mae` | 7.7512 |
| `baseline_ridge.rmse` | 13.514 |
| `baseline_ridge.wape` | 0.1465 |
| `baseline_ridge.r2` | 0.41203 |
| `challenger_gbm.mae` | 5.2713 |
| `challenger_gbm.rmse` | 11.51 |
| `challenger_gbm.wape` | 0.099631 |
| `challenger_gbm.r2` | 0.57348 |
| `mae_gain_vs_baseline` | 0.31994 |
| `interval_80_coverage` | 0.6576 |
| `interval_80_mean_width` | 9.1726 |
| `segment_mae.0` | 5.2908 |
| `segment_mae.1` | 5.0903 |
| `segment_mae.2` | 5.0054 |
| `segment_mae.3` | 6.8376 |
| `worst_segment_vs_overall` | 1.2971 |
| `leaky_feature_rmse` | 1.7436 |
| `honest_rmse` | 11.51 |
| `random_split_mae` | 4.5073 |
| `chronological_mae` | 5.2713 |

</details>
