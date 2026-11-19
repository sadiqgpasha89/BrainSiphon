# Automated Valuation Model (AVM): worked example

> Run on synthetic data with `regression` engine, seed 51622, knobs {"n": 22200, "outlier_share": 0.01, "drift": 0.15}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.

**Constraints that shape the design.** Median error under 6% with a published confidence score; Valuation must not use protected attributes or their proxies; Explainable comparable set for every value

**Label in this use case.** For "Automated Valuation Model (AVM)": Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on sales after the valuation date leaks the trend.

## 2. Choose the signals

Your strongest signal is **Comparable sale density** (count and recency of sales within 0.5 km and 90 days). Its rule: Only sales that closed before the valuation date. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 7.09 to 1.43, which looks like a breakthrough and is leakage. A random split reports MAE 3.40 against 3.67 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.26; the boosted model 3.67, a gain of 41.5%. Its 80% interval covers 72.6% of outcomes. The hardest segment has an error 1.47 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.26 |
| MAE, boosted challenger | 3.67 |
| MAE gain over the baseline | 41.5% |
| 80% interval coverage | 72.6% |
| Worst segment versus overall MAE | 1.47x |
| RMSE with a leaky column versus honest | 1.43 vs 7.09 |

## 5. An edge case from the blueprint

**Thin market.** few sales within the radius. Planned response: Widen the range and show the lower confidence score instead of a falsely precise value. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22200 |
| `train_rows` | 15539 |
| `test_rows` | 6661 |
| `baseline_ridge.mae` | 6.264 |
| `baseline_ridge.rmse` | 9.654 |
| `baseline_ridge.wape` | 0.11899 |
| `baseline_ridge.r2` | 0.5233 |
| `challenger_gbm.mae` | 3.666 |
| `challenger_gbm.rmse` | 7.0926 |
| `challenger_gbm.wape` | 0.069639 |
| `challenger_gbm.r2` | 0.7427 |
| `mae_gain_vs_baseline` | 0.41475 |
| `interval_80_coverage` | 0.72572 |
| `interval_80_mean_width` | 8.8079 |
| `segment_mae.0` | 3.6849 |
| `segment_mae.1` | 3.3411 |
| `segment_mae.2` | 3.6639 |
| `segment_mae.3` | 5.4033 |
| `worst_segment_vs_overall` | 1.4739 |
| `leaky_feature_rmse` | 1.4315 |
| `honest_rmse` | 7.0926 |
| `random_split_mae` | 3.3954 |
| `chronological_mae` | 3.666 |

</details>
