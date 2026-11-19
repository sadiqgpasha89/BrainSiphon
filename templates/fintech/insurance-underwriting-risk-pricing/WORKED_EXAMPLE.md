# Insurance Underwriting & Risk Pricing: worked example

> Run on synthetic data with `regression` engine, seed 64833, knobs {"n": 25760, "outlier_share": 0.035, "drift": 0.324}, in 4.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules.

**Constraints that shape the design.** Rating factors must be filed with regulators; No prohibited attributes; Quote in 80 ms

**Label in this use case.** For "Insurance Underwriting & Risk Pricing": Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Immature claims in training window.

## 2. Choose the signals

Your strongest signal is **Exposure-adjusted claim frequency** (claims per policy-year by segment). Its rule: Offset by earned exposure. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.16 to 1.54, which looks like a breakthrough and is leakage. A random split reports MAE 5.07 against 5.63 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.98; the boosted model 5.63, a gain of 29.5%. Its 80% interval covers 65.0% of outcomes. The hardest segment has an error 1.22 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.98 |
| MAE, boosted challenger | 5.63 |
| MAE gain over the baseline | 29.5% |
| 80% interval coverage | 65.0% |
| Worst segment versus overall MAE | 1.22x |
| RMSE with a leaky column versus honest | 1.54 vs 12.16 |

## 5. An edge case from the blueprint

**Claims development lag.** recent cohorts look better than they are. Planned response: IBNR adjustments and development-factor features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25760 |
| `train_rows` | 18032 |
| `test_rows` | 7728 |
| `baseline_ridge.mae` | 7.9842 |
| `baseline_ridge.rmse` | 13.96 |
| `baseline_ridge.wape` | 0.15027 |
| `baseline_ridge.r2` | 0.39355 |
| `challenger_gbm.mae` | 5.6257 |
| `challenger_gbm.rmse` | 12.159 |
| `challenger_gbm.wape` | 0.10588 |
| `challenger_gbm.r2` | 0.53996 |
| `mae_gain_vs_baseline` | 0.2954 |
| `interval_80_coverage` | 0.65049 |
| `interval_80_mean_width` | 9.2838 |
| `segment_mae.0` | 5.317 |
| `segment_mae.1` | 5.8434 |
| `segment_mae.2` | 5.8293 |
| `segment_mae.3` | 6.8727 |
| `worst_segment_vs_overall` | 1.2217 |
| `leaky_feature_rmse` | 1.5357 |
| `honest_rmse` | 12.159 |
| `random_split_mae` | 5.0686 |
| `chronological_mae` | 5.6257 |

</details>
