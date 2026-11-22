# Healthcare Audit Readiness Prediction: worked example

> Run on synthetic data with `regression` engine, seed 3242, knobs {"n": 25730, "outlier_share": 0.034, "drift": 0.226}, in 15.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification.

**Constraints that shape the design.** The audit or compliance leader signs off readiness and the score is never a certification or a prediction of an audit result; Transparent weighted rules are the base and the model only estimates the chance of unresolved gaps; Each score shows its blockers and the evidence behind them

**Label in this use case.** For "Healthcare Audit Readiness Prediction": Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Presenting readiness as certification.

## 2. Choose the signals

Your strongest signal is **Criteria completion share** (share of criteria with accepted evidence and passing tests). Its rule: Status at scoring. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.17 to 1.48, which looks like a breakthrough and is leakage. A random split reports MAE 5.07 against 5.30 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 7.81; the boosted model 5.30, a gain of 32.1%. Its 80% interval covers 69.9% of outcomes. The hardest segment has an error 1.29 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 7.81 |
| MAE, boosted challenger | 5.30 |
| MAE gain over the baseline | 32.1% |
| 80% interval coverage | 69.9% |
| Worst segment versus overall MAE | 1.29x |
| RMSE with a leaky column versus honest | 1.48 vs 12.17 |

## 5. An edge case from the blueprint

**Criteria change mid-cycle.** scores are not comparable. Planned response: Criteria version and a restatement. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25730 |
| `train_rows` | 18011 |
| `test_rows` | 7719 |
| `baseline_ridge.mae` | 7.8063 |
| `baseline_ridge.rmse` | 13.897 |
| `baseline_ridge.wape` | 0.14816 |
| `baseline_ridge.r2` | 0.37289 |
| `challenger_gbm.mae` | 5.3015 |
| `challenger_gbm.rmse` | 12.172 |
| `challenger_gbm.wape` | 0.10062 |
| `challenger_gbm.r2` | 0.51896 |
| `mae_gain_vs_baseline` | 0.32087 |
| `interval_80_coverage` | 0.69854 |
| `interval_80_mean_width` | 9.4491 |
| `segment_mae.0` | 5.2907 |
| `segment_mae.1` | 5.0341 |
| `segment_mae.2` | 5.382 |
| `segment_mae.3` | 6.8406 |
| `worst_segment_vs_overall` | 1.2903 |
| `leaky_feature_rmse` | 1.4819 |
| `honest_rmse` | 12.172 |
| `random_split_mae` | 5.0659 |
| `chronological_mae` | 5.3015 |

</details>
