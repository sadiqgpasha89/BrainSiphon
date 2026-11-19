# Collateral Valuation & Haircut Monitoring: worked example

> Run on synthetic data with `regression` engine, seed 10235, knobs {"n": 19730, "outlier_share": 0.029, "drift": 0.331}, in 3.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.

**Constraints that shape the design.** Daily revaluation before the margin cut-off; Haircuts follow the board-approved policy bounds; Independent price sources for assets with no market

**Label in this use case.** For "Collateral Valuation & Haircut Monitoring": Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-test on calm markets misses stressed haircuts.

## 2. Choose the signals

Your strongest signal is **Price momentum and volatility** (20-day return and realised volatility of the reference price). Its rule: Use settlement prices, not stale quotes. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.54 to 1.53, which looks like a breakthrough and is leakage. A random split reports MAE 4.78 against 5.40 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.75; the boosted model 5.40, a gain of 30.4%. Its 80% interval covers 64.3% of outcomes. The hardest segment has an error 1.25 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.75 |
| MAE, boosted challenger | 5.40 |
| MAE gain over the baseline | 30.4% |
| 80% interval coverage | 64.3% |
| Worst segment versus overall MAE | 1.25x |
| RMSE with a leaky column versus honest | 1.53 vs 11.54 |

## 5. An edge case from the blueprint

**Price feed outage.** collateral is valued at yesterday's price. Planned response: Fallback to the last good price with an age penalty and an alert. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19730 |
| `train_rows` | 13811 |
| `test_rows` | 5919 |
| `baseline_ridge.mae` | 7.749 |
| `baseline_ridge.rmse` | 13.35 |
| `baseline_ridge.wape` | 0.14626 |
| `baseline_ridge.r2` | 0.41143 |
| `challenger_gbm.mae` | 5.3957 |
| `challenger_gbm.rmse` | 11.544 |
| `challenger_gbm.wape` | 0.10184 |
| `challenger_gbm.r2` | 0.55992 |
| `mae_gain_vs_baseline` | 0.30369 |
| `interval_80_coverage` | 0.64285 |
| `interval_80_mean_width` | 9.267 |
| `segment_mae.0` | 5.2477 |
| `segment_mae.1` | 5.5614 |
| `segment_mae.2` | 5.1005 |
| `segment_mae.3` | 6.7547 |
| `worst_segment_vs_overall` | 1.2518 |
| `leaky_feature_rmse` | 1.5303 |
| `honest_rmse` | 11.544 |
| `random_split_mae` | 4.7796 |
| `chronological_mae` | 5.3957 |

</details>
