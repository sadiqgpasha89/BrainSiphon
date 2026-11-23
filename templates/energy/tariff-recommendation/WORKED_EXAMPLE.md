# Tariff Recommendation: worked example

> Run on synthetic data with `regression` engine, seed 34988, knobs {"n": 16430, "outlier_share": 0.031, "drift": 0.303}, in 4.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy.

**Constraints that shape the design.** Recommendation based on the customer's own usage and consent; Savings shown with a range; The cheapest plan is shown even when it is not the utility's most profitable

**Label in this use case.** For "Tariff Recommendation": Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Typical household assumptions.

## 2. Choose the signals

Your strongest signal is **Replayed annual cost** (cost of past usage under each tariff). Its rule: From interval data. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.67 to 1.54, which looks like a breakthrough and is leakage. A random split reports MAE 4.60 against 5.45 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.82; the boosted model 5.45, a gain of 30.4%. Its 80% interval covers 65.4% of outcomes. The hardest segment has an error 1.38 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.82 |
| MAE, boosted challenger | 5.45 |
| MAE gain over the baseline | 30.4% |
| 80% interval coverage | 65.4% |
| Worst segment versus overall MAE | 1.38x |
| RMSE with a leaky column versus honest | 1.54 vs 11.67 |

## 5. An edge case from the blueprint

**Short history.** less than a year of data. Planned response: Wide ranges and a low confidence note. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16430 |
| `train_rows` | 11501 |
| `test_rows` | 4929 |
| `baseline_ridge.mae` | 7.8237 |
| `baseline_ridge.rmse` | 13.508 |
| `baseline_ridge.wape` | 0.14787 |
| `baseline_ridge.r2` | 0.41003 |
| `challenger_gbm.mae` | 5.4477 |
| `challenger_gbm.rmse` | 11.666 |
| `challenger_gbm.wape` | 0.10296 |
| `challenger_gbm.r2` | 0.55996 |
| `mae_gain_vs_baseline` | 0.3037 |
| `interval_80_coverage` | 0.65449 |
| `interval_80_mean_width` | 9.709 |
| `segment_mae.0` | 5.0062 |
| `segment_mae.1` | 5.4024 |
| `segment_mae.2` | 6.2603 |
| `segment_mae.3` | 7.5232 |
| `worst_segment_vs_overall` | 1.381 |
| `leaky_feature_rmse` | 1.539 |
| `honest_rmse` | 11.666 |
| `random_split_mae` | 4.5955 |
| `chronological_mae` | 5.4477 |

</details>
