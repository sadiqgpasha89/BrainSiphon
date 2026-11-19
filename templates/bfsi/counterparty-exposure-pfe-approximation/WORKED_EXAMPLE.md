# Counterparty Exposure (PFE) Approximation with ML: worked example

> Run on synthetic data with `regression` engine, seed 24172, knobs {"n": 22430, "outlier_share": 0.019, "drift": 0.2}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance.

**Constraints that shape the design.** Approximation error within the risk-approved tolerance; Fallback to the full engine for large trades; Model re-trained after market regime changes

**Label in this use case.** For "Counterparty Exposure (PFE) Approximation with ML": Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on calm periods.

## 2. Choose the signals

Your strongest signal is **Trade sensitivities** (delta, vega and DV01 of the trade and the set). Its rule: Computed on the same curves. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.34 to 1.56, which looks like a breakthrough and is leakage. A random split reports MAE 4.17 against 4.35 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.01; the boosted model 4.35, a gain of 37.9%. Its 80% interval covers 71.8% of outcomes. The hardest segment has an error 1.61 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.01 |
| MAE, boosted challenger | 4.35 |
| MAE gain over the baseline | 37.9% |
| 80% interval coverage | 71.8% |
| Worst segment versus overall MAE | 1.61x |
| RMSE with a leaky column versus honest | 1.56 vs 9.34 |

## 5. An edge case from the blueprint

**Exotic trade.** out of the surrogate's training domain. Planned response: Domain flag and fallback to the engine. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22430 |
| `train_rows` | 15700 |
| `test_rows` | 6730 |
| `baseline_ridge.mae` | 7.0074 |
| `baseline_ridge.rmse` | 11.643 |
| `baseline_ridge.wape` | 0.13317 |
| `baseline_ridge.r2` | 0.45826 |
| `challenger_gbm.mae` | 4.3505 |
| `challenger_gbm.rmse` | 9.3441 |
| `challenger_gbm.wape` | 0.082679 |
| `challenger_gbm.r2` | 0.65105 |
| `mae_gain_vs_baseline` | 0.37915 |
| `interval_80_coverage` | 0.71798 |
| `interval_80_mean_width` | 9.1409 |
| `segment_mae.0` | 4.2213 |
| `segment_mae.1` | 4.2051 |
| `segment_mae.2` | 4.2419 |
| `segment_mae.3` | 7.0023 |
| `worst_segment_vs_overall` | 1.6095 |
| `leaky_feature_rmse` | 1.5602 |
| `honest_rmse` | 9.3441 |
| `random_split_mae` | 4.17 |
| `chronological_mae` | 4.3505 |

</details>
