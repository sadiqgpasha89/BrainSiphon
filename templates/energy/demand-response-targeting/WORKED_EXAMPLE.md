# Demand Response Targeting: worked example

> Run on synthetic data with `regression` engine, seed 47876, knobs {"n": 16670, "outlier_share": 0.011, "drift": 0.168}, in 4.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience.

**Constraints that shape the design.** Only customers who opted in; Fatigue limits on events per customer; Reduction measured against a baseline

**Label in this use case.** For "Demand Response Targeting": Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using total consumption as the target.

## 2. Choose the signals

Your strongest signal is **Past event response** (measured reduction in earlier events). Its rule: Baseline adjusted. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.38 to 1.62, which looks like a breakthrough and is leakage. A random split reports MAE 3.71 against 3.96 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.61; the boosted model 3.96, a gain of 40.0%. Its 80% interval covers 71.4% of outcomes. The hardest segment has an error 1.38 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.61 |
| MAE, boosted challenger | 3.96 |
| MAE gain over the baseline | 40.0% |
| 80% interval coverage | 71.4% |
| Worst segment versus overall MAE | 1.38x |
| RMSE with a leaky column versus honest | 1.62 vs 8.38 |

## 5. An edge case from the blueprint

**Baseline error.** the measured reduction is overstated. Planned response: Control groups and conservative baselines. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16670 |
| `train_rows` | 11669 |
| `test_rows` | 5001 |
| `baseline_ridge.mae` | 6.6066 |
| `baseline_ridge.rmse` | 10.716 |
| `baseline_ridge.wape` | 0.12447 |
| `baseline_ridge.r2` | 0.49208 |
| `challenger_gbm.mae` | 3.9609 |
| `challenger_gbm.rmse` | 8.3849 |
| `challenger_gbm.wape` | 0.074621 |
| `challenger_gbm.r2` | 0.68903 |
| `mae_gain_vs_baseline` | 0.40047 |
| `interval_80_coverage` | 0.71426 |
| `interval_80_mean_width` | 8.8241 |
| `segment_mae.0` | 3.8129 |
| `segment_mae.1` | 3.8415 |
| `segment_mae.2` | 4.1185 |
| `segment_mae.3` | 5.4739 |
| `worst_segment_vs_overall` | 1.382 |
| `leaky_feature_rmse` | 1.6222 |
| `honest_rmse` | 8.3849 |
| `random_split_mae` | 3.7138 |
| `chronological_mae` | 3.9609 |

</details>
