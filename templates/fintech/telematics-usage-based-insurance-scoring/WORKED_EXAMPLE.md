# Telematics Usage-Based Insurance Scoring: worked example

> Run on synthetic data with `regression` engine, seed 30590, knobs {"n": 21880, "outlier_share": 0.016, "drift": 0.39}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback.

**Constraints that shape the design.** Battery impact on phones; Trip detection accuracy; Privacy of location data

**Label in this use case.** For "Telematics Usage-Based Insurance Scoring": Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Short observation windows with no claims yet.

## 2. Choose the signals

Your strongest signal is **Harsh events per 100km by road class** (events normalised by distance and road class). Its rule: Map-match to road class. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 9.66 to 1.84, which looks like a breakthrough and is leakage. A random split reports MAE 3.98 against 5.09 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.21; the boosted model 5.09, a gain of 29.3%. Its 80% interval covers 60.0% of outcomes. The hardest segment has an error 1.24 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.21 |
| MAE, boosted challenger | 5.09 |
| MAE gain over the baseline | 29.3% |
| 80% interval coverage | 60.0% |
| Worst segment versus overall MAE | 1.24x |
| RMSE with a leaky column versus honest | 1.84 vs 9.66 |

## 5. An edge case from the blueprint

**Passenger in car misdetected as driver.** the passenger’s driving score is wrongly attributed to the policyholder. Planned response: Driver-identification model and manual confirmation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21880 |
| `train_rows` | 15315 |
| `test_rows` | 6565 |
| `baseline_ridge.mae` | 7.2062 |
| `baseline_ridge.rmse` | 11.746 |
| `baseline_ridge.wape` | 0.1369 |
| `baseline_ridge.r2` | 0.49417 |
| `challenger_gbm.mae` | 5.0925 |
| `challenger_gbm.rmse` | 9.6646 |
| `challenger_gbm.wape` | 0.096741 |
| `challenger_gbm.r2` | 0.65757 |
| `mae_gain_vs_baseline` | 0.29333 |
| `interval_80_coverage` | 0.6 |
| `interval_80_mean_width` | 8.8875 |
| `segment_mae.0` | 4.9912 |
| `segment_mae.1` | 5.0166 |
| `segment_mae.2` | 5.1745 |
| `segment_mae.3` | 6.3041 |
| `worst_segment_vs_overall` | 1.2379 |
| `leaky_feature_rmse` | 1.8446 |
| `honest_rmse` | 9.6646 |
| `random_split_mae` | 3.9821 |
| `chronological_mae` | 5.0925 |

</details>
