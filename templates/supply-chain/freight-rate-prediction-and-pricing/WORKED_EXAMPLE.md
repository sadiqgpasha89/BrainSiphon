# Freight Rate Prediction & Pricing: worked example

> Run on synthetic data with `regression` engine, seed 37876, knobs {"n": 20590, "outlier_share": 0.01, "drift": 0.307}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin.

**Constraints that shape the design.** Quote in 100 ms; Margin floors; Volatile fuel and capacity

**Label in this use case.** For "Freight Rate Prediction & Pricing": Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Won quotes only in training.

## 2. Choose the signals

Your strongest signal is **Lane market index** (rolling spot index per lane). Its rule: Index lag. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.08 to 1.63, which looks like a breakthrough and is leakage. A random split reports MAE 3.82 against 4.30 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.64; the boosted model 4.30, a gain of 35.3%. Its 80% interval covers 64.3% of outcomes. The hardest segment has an error 1.28 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.64 |
| MAE, boosted challenger | 4.30 |
| MAE gain over the baseline | 35.3% |
| 80% interval coverage | 64.3% |
| Worst segment versus overall MAE | 1.28x |
| RMSE with a leaky column versus honest | 1.63 vs 8.08 |

## 5. An edge case from the blueprint

**Hurricane disrupts capacity.** capacity collapses and spot rates spike beyond anything the model has seen. Planned response: Event features and wide intervals. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20590 |
| `train_rows` | 14412 |
| `test_rows` | 6178 |
| `baseline_ridge.mae` | 6.6433 |
| `baseline_ridge.rmse` | 10.389 |
| `baseline_ridge.wape` | 0.12592 |
| `baseline_ridge.r2` | 0.53239 |
| `challenger_gbm.mae` | 4.2962 |
| `challenger_gbm.rmse` | 8.0841 |
| `challenger_gbm.wape` | 0.08143 |
| `challenger_gbm.r2` | 0.71688 |
| `mae_gain_vs_baseline` | 0.3533 |
| `interval_80_coverage` | 0.64293 |
| `interval_80_mean_width` | 8.7463 |
| `segment_mae.0` | 4.1959 |
| `segment_mae.1` | 4.2558 |
| `segment_mae.2` | 4.2957 |
| `segment_mae.3` | 5.4958 |
| `worst_segment_vs_overall` | 1.2792 |
| `leaky_feature_rmse` | 1.6331 |
| `honest_rmse` | 8.0841 |
| `random_split_mae` | 3.8154 |
| `chronological_mae` | 4.2962 |

</details>
