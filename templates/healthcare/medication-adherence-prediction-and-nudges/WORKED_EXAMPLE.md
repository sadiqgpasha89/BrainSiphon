# Medication Adherence Prediction & Nudges: worked example

> Run on synthetic data with `regression` engine, seed 22922, knobs {"n": 18630, "outlier_share": 0.031, "drift": 0.275}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget.

**Constraints that shape the design.** Consent for outreach; Equity in nudges; Contact fatigue

**Label in this use case.** For "Medication Adherence Prediction & Nudges": Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Missing fills at other pharmacies counted as non-adherence.

## 2. Choose the signals

Your strongest signal is **Refill gap pattern** (days late on past refills). Its rule: Matured fills only. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 11.90 to 1.54, which looks like a breakthrough and is leakage. A random split reports MAE 4.90 against 5.42 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.67; the boosted model 5.42, a gain of 29.3%. Its 80% interval covers 67.3% of outcomes. The hardest segment has an error 1.02 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.67 |
| MAE, boosted challenger | 5.42 |
| MAE gain over the baseline | 29.3% |
| 80% interval coverage | 67.3% |
| Worst segment versus overall MAE | 1.02x |
| RMSE with a leaky column versus honest | 1.54 vs 11.90 |

## 5. An edge case from the blueprint

**Patient switches pharmacies.** appears non-adherent. Planned response: Cross-pharmacy fill linkage. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18630 |
| `train_rows` | 13041 |
| `test_rows` | 5589 |
| `baseline_ridge.mae` | 7.6689 |
| `baseline_ridge.rmse` | 13.709 |
| `baseline_ridge.wape` | 0.14567 |
| `baseline_ridge.r2` | 0.40676 |
| `challenger_gbm.mae` | 5.4196 |
| `challenger_gbm.rmse` | 11.902 |
| `challenger_gbm.wape` | 0.10294 |
| `challenger_gbm.r2` | 0.55282 |
| `mae_gain_vs_baseline` | 0.2933 |
| `interval_80_coverage` | 0.67347 |
| `interval_80_mean_width` | 9.7824 |
| `segment_mae.0` | 5.4933 |
| `segment_mae.1` | 5.2346 |
| `segment_mae.2` | 5.524 |
| `segment_mae.3` | 5.4277 |
| `worst_segment_vs_overall` | 1.0193 |
| `leaky_feature_rmse` | 1.5379 |
| `honest_rmse` | 11.902 |
| `random_split_mae` | 4.8963 |
| `chronological_mae` | 5.4196 |

</details>
