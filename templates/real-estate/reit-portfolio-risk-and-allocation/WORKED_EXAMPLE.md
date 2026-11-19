# REIT Portfolio Risk & Allocation: worked example

> Run on synthetic data with `regression` engine, seed 61961, knobs {"n": 17960, "outlier_share": 0.035, "drift": 0.325}, in 3.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits.

**Constraints that shape the design.** Allocation changes stay within sector, region, leverage and single-asset limits in the mandate; Liquidity limits constrain how fast any asset can be sold; Reviewed quarterly by the investment committee

**Label in this use case.** For "REIT Portfolio Risk & Allocation": Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-tests that use smoothed returns show low risk that does not exist.

## 2. Choose the signals

Your strongest signal is **De-smoothed volatility** (standard deviation of returns after an autoregressive correction for appraisal smoothing). Its rule: Depends on the smoothing model, so test its sensitivity. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.36 to 1.48, which looks like a breakthrough and is leakage. A random split reports MAE 5.22 against 5.70 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.88; the boosted model 5.70, a gain of 27.7%. Its 80% interval covers 65.4% of outcomes. The hardest segment has an error 1.26 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.88 |
| MAE, boosted challenger | 5.70 |
| MAE gain over the baseline | 27.7% |
| 80% interval coverage | 65.4% |
| Worst segment versus overall MAE | 1.26x |
| RMSE with a leaky column versus honest | 1.48 vs 12.36 |

## 5. An edge case from the blueprint

**Valuation lag.** Appraisal-based values lag the market so risk looks smaller than it is. Planned response: Use de-smoothed returns when estimating volatility and correlation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17960 |
| `train_rows` | 12572 |
| `test_rows` | 5388 |
| `baseline_ridge.mae` | 7.8797 |
| `baseline_ridge.rmse` | 14.005 |
| `baseline_ridge.wape` | 0.14831 |
| `baseline_ridge.r2` | 0.40359 |
| `challenger_gbm.mae` | 5.6969 |
| `challenger_gbm.rmse` | 12.36 |
| `challenger_gbm.wape` | 0.10723 |
| `challenger_gbm.r2` | 0.53546 |
| `mae_gain_vs_baseline` | 0.27701 |
| `interval_80_coverage` | 0.65442 |
| `interval_80_mean_width` | 9.5847 |
| `segment_mae.0` | 5.5027 |
| `segment_mae.1` | 6.0977 |
| `segment_mae.2` | 5.0208 |
| `segment_mae.3` | 7.1979 |
| `worst_segment_vs_overall` | 1.2635 |
| `leaky_feature_rmse` | 1.4809 |
| `honest_rmse` | 12.36 |
| `random_split_mae` | 5.218 |
| `chronological_mae` | 5.6969 |

</details>
