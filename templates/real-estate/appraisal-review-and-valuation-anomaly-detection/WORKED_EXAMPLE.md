# Appraisal Review & Valuation Anomaly Detection: worked example

> Run on synthetic data with `tabular` engine, seed 10088, knobs {"n_entities": 1880, "positive_entity_rate": 0.023, "n_flash_sales": 4}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them.

**Constraints that shape the design.** Reviewer sees the evidence; Appraiser independence rules; Review capacity

**Label in this use case.** For "Appraisal Review & Valuation Anomaly Detection": Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Confirmed issues are those that defaulted.

## 2. Choose the signals

Your strongest signal is **Appraisal to AVM gap** (log difference scaled by AVM interval). Its rule: AVM coverage. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.48% of the test period) and labels arrive weeks late. A model that always answers no would be 99.52% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.653 and finds 78.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.675 and 74.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.48% |
| Baseline PR-AUC | 0.653 |
| Baseline recall at 0.5% false positives | 78.9% |
| Challenger PR-AUC | 0.675 |
| Challenger recall at 0.5% false positives | 74.3% |

## 5. An edge case from the blueprint

**Unique property.** A unique property sits outside the range where the independent valuation is reliable. Planned response: Use wider tolerances for unique properties and say so in the review note. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 144848 |
| `positive_rate` | 0.0029617 |
| `test_rows` | 49117 |
| `test_positive_rate` | 0.0048252 |
| `baseline_lr.pr_auc` | 0.65301 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78903 |
| `baseline_lr.brier` | 0.0030901 |
| `challenger_hgb.pr_auc` | 0.675 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74262 |
| `challenger_hgb.brier` | 0.0024828 |

</details>
