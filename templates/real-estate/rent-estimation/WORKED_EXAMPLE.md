# Rental Price Estimation: worked example

> Run on synthetic data with `regression` engine, seed 74723, knobs {"n": 22820, "outlier_share": 0.034, "drift": 0.227}, in 3.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the market rent for a home or unit so owners, agents and tenants see a credible range.

**Constraints that shape the design.** Response under 80 ms; Range shown with the estimate; No protected attributes or proxies

**Label in this use case.** For "Rental Price Estimation": Estimate the market rent for a home or unit so owners, agents and tenants see a credible range. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Asking rents leak into labels.

## 2. Choose the signals

Your strongest signal is **Local median rent per room** (trailing 60-day median in the micro-area). Its rule: Mix of unit types. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.71 to 1.47, which looks like a breakthrough and is leakage. A random split reports MAE 4.85 against 5.16 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.69; the boosted model 5.16, a gain of 32.9%. Its 80% interval covers 69.4% of outcomes. The hardest segment has an error 1.18 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.69 |
| MAE, boosted challenger | 5.16 |
| MAE gain over the baseline | 32.9% |
| 80% interval coverage | 69.4% |
| Worst segment versus overall MAE | 1.18x |
| RMSE with a leaky column versus honest | 1.47 vs 11.71 |

## 5. An edge case from the blueprint

**New building.** A new building has no rent history to learn from. Planned response: Use priors from similar buildings and widen the interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22820 |
| `train_rows` | 15973 |
| `test_rows` | 6847 |
| `baseline_ridge.mae` | 7.6898 |
| `baseline_ridge.rmse` | 13.531 |
| `baseline_ridge.wape` | 0.14443 |
| `baseline_ridge.r2` | 0.39265 |
| `challenger_gbm.mae` | 5.1583 |
| `challenger_gbm.rmse` | 11.712 |
| `challenger_gbm.wape` | 0.096882 |
| `challenger_gbm.r2` | 0.54499 |
| `mae_gain_vs_baseline` | 0.3292 |
| `interval_80_coverage` | 0.69359 |
| `interval_80_mean_width` | 9.4033 |
| `segment_mae.0` | 4.9064 |
| `segment_mae.1` | 5.2557 |
| `segment_mae.2` | 5.5048 |
| `segment_mae.3` | 6.0697 |
| `worst_segment_vs_overall` | 1.1767 |
| `leaky_feature_rmse` | 1.4697 |
| `honest_rmse` | 11.712 |
| `random_split_mae` | 4.8547 |
| `chronological_mae` | 5.1583 |

</details>
