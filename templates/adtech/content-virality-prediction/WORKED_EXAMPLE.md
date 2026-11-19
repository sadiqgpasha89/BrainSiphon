# Content Virality & Engagement Prediction: worked example

> Run on synthetic data with `regression` engine, seed 14751, knobs {"n": 22820, "outlier_share": 0.012, "drift": 0.325}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict early whether a post or video will go viral to allocate promotion budget and inform creators.

**Constraints that shape the design.** Heavy-tailed outcomes; Predictions from first minutes; Fairness to creators

**Label in this use case.** For "Content Virality & Engagement Prediction": Predict early whether a post or video will go viral to allocate promotion budget and inform creators. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using future engagement leaked into features.

## 2. Choose the signals

Your strongest signal is **Early velocity** (engagement in the first 10 minutes). Its rule: Window. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 8.60 to 1.92, which looks like a breakthrough and is leakage. A random split reports MAE 3.73 against 4.53 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 6.88; the boosted model 4.53, a gain of 34.2%. Its 80% interval covers 64.0% of outcomes. The hardest segment has an error 1.50 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 6.88 |
| MAE, boosted challenger | 4.53 |
| MAE gain over the baseline | 34.2% |
| 80% interval coverage | 64.0% |
| Worst segment versus overall MAE | 1.50x |
| RMSE with a leaky column versus honest | 1.92 vs 8.60 |

## 5. An edge case from the blueprint

**Coordinated inauthentic boosting.** model promotes manipulated content. Planned response: Authenticity filters before promotion. Write the test that replays this case through your pipeline before you tune anything.

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
| `baseline_ridge.mae` | 6.8785 |
| `baseline_ridge.rmse` | 10.895 |
| `baseline_ridge.wape` | 0.12973 |
| `baseline_ridge.r2` | 0.52835 |
| `challenger_gbm.mae` | 4.5275 |
| `challenger_gbm.rmse` | 8.6042 |
| `challenger_gbm.wape` | 0.085388 |
| `challenger_gbm.r2` | 0.70586 |
| `mae_gain_vs_baseline` | 0.34178 |
| `interval_80_coverage` | 0.64013 |
| `interval_80_mean_width` | 8.8021 |
| `segment_mae.0` | 4.3423 |
| `segment_mae.1` | 4.4524 |
| `segment_mae.2` | 4.5916 |
| `segment_mae.3` | 6.8139 |
| `worst_segment_vs_overall` | 1.505 |
| `leaky_feature_rmse` | 1.9188 |
| `honest_rmse` | 8.6042 |
| `random_split_mae` | 3.7258 |
| `chronological_mae` | 4.5275 |

</details>
