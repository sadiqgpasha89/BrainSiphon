# 30-Day Readmission Risk Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 9340, knobs {"n_entities": 2470, "positive_entity_rate": 0.04, "n_flash_sales": 8}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity.

**Constraints that shape the design.** Fairness across demographics; Daily scoring at discharge; Explainable factors for care managers

**Label in this use case.** For "30-Day Readmission Risk Prediction": Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels hide admissions at other hospitals.

## 2. Choose the signals

Your strongest signal is **Prior-year admissions** (count of admissions in prior 12 months). Its rule: Exclude the index stay. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.62% of the test period) and labels arrive weeks late. A model that always answers no would be 99.38% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.834 and finds 86.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.873 and 89.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.62% |
| Baseline PR-AUC | 0.834 |
| Baseline recall at 0.5% false positives | 86.6% |
| Challenger PR-AUC | 0.873 |
| Challenger recall at 0.5% false positives | 89.5% |

## 5. An edge case from the blueprint

**Planned readmissions counted as failures.** model learns wrong risk. Planned response: Exclude planned readmissions per CMS logic. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Expect lower numbers and a different first failure on real data. Keep the chronological split, the matured-label rule and the future-truncation test, and replace the synthetic generator with your extract.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 185402 |
| `positive_rate` | 0.0056903 |
| `test_rows` | 62390 |
| `test_positive_rate` | 0.006235 |
| `baseline_lr.pr_auc` | 0.83389 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.86632 |
| `baseline_lr.brier` | 0.0019395 |
| `challenger_hgb.pr_auc` | 0.87279 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8946 |
| `challenger_hgb.brier` | 0.0017601 |

</details>
