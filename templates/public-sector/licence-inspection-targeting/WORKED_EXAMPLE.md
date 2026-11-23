# Business Licence Inspection Targeting: worked example

> Run on synthetic data with `tabular` engine, seed 67034, knobs {"n_entities": 2600, "positive_entity_rate": 0.042, "n_flash_sales": 7}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness.

**Constraints that shape the design.** A share of inspections stays random; Scores rank visits and never trigger a penalty; Inspectors decide findings

**Label in this use case.** For "Business Licence Inspection Targeting": Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Risk-only sampling.

## 2. Choose the signals

Your strongest signal is **Past violation history** (serious findings in earlier inspections). Its rule: From inspections. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.48% of the test period) and labels arrive weeks late. A model that always answers no would be 99.52% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.559 and finds 60.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.603 and 60.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.48% |
| Baseline PR-AUC | 0.559 |
| Baseline recall at 0.5% false positives | 60.9% |
| Challenger PR-AUC | 0.603 |
| Challenger recall at 0.5% false positives | 60.5% |

## 5. An edge case from the blueprint

**New business.** the business has no inspection history. Planned response: Type-based priors and a first-visit rule. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 204751 |
| `positive_rate` | 0.0049182 |
| `test_rows` | 68918 |
| `test_positive_rate` | 0.0048173 |
| `baseline_lr.pr_auc` | 0.55866 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.60908 |
| `baseline_lr.brier` | 0.0030901 |
| `challenger_hgb.pr_auc` | 0.6034 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.60542 |
| `challenger_hgb.brier` | 0.0027304 |

</details>
