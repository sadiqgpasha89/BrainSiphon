# Buy-Box & Seller Offer Ranking: worked example

> Run on synthetic data with `regression` engine, seed 11149, knobs {"n": 16310, "outlier_share": 0.034, "drift": 0.339}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience.

**Constraints that shape the design.** Transparent seller policy; Anti-gaming; 30 ms

**Label in this use case.** For "Buy-Box & Seller Offer Ranking": Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes confounded by Buy Box position.

## 2. Choose the signals

Your strongest signal is **Landed price percentile** (price plus shipping percentile). Its rule: Include taxes. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 13.28 to 1.41, which looks like a breakthrough and is leakage. A random split reports MAE 5.35 against 6.15 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.19; the boosted model 6.15, a gain of 24.9%. Its 80% interval covers 62.9% of outcomes. The hardest segment has an error 1.32 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.19 |
| MAE, boosted challenger | 6.15 |
| MAE gain over the baseline | 24.9% |
| 80% interval coverage | 62.9% |
| Worst segment versus overall MAE | 1.32x |
| RMSE with a leaky column versus honest | 1.41 vs 13.28 |

## 5. An edge case from the blueprint

**Seller price manipulation timed with ranking refresh.** sellers game the refresh window with brief price cuts to win the featured offer. Planned response: Randomised windows and anomaly detection. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16310 |
| `train_rows` | 11417 |
| `test_rows` | 4893 |
| `baseline_ridge.mae` | 8.1885 |
| `baseline_ridge.rmse` | 14.661 |
| `baseline_ridge.wape` | 0.15407 |
| `baseline_ridge.r2` | 0.38112 |
| `challenger_gbm.mae` | 6.1522 |
| `challenger_gbm.rmse` | 13.284 |
| `challenger_gbm.wape` | 0.11576 |
| `challenger_gbm.r2` | 0.4919 |
| `mae_gain_vs_baseline` | 0.24868 |
| `interval_80_coverage` | 0.62927 |
| `interval_80_mean_width` | 9.8836 |
| `segment_mae.0` | 5.9038 |
| `segment_mae.1` | 6.1411 |
| `segment_mae.2` | 6.2861 |
| `segment_mae.3` | 8.0939 |
| `worst_segment_vs_overall` | 1.3156 |
| `leaky_feature_rmse` | 1.408 |
| `honest_rmse` | 13.284 |
| `random_split_mae` | 5.3548 |
| `chronological_mae` | 6.1522 |

</details>
