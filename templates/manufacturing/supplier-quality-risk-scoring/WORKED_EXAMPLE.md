# Supplier Quality Risk Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 4482, knobs {"n_entities": 2120, "positive_entity_rate": 0.041, "n_flash_sales": 5}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster.

**Constraints that shape the design.** Skip-lot rules must satisfy the quality agreement; Scores explained to supplier quality engineers; Critical parts are never fully skipped

**Label in this use case.** For "Supplier Quality Risk Scoring": Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using supplier averages only.

## 2. Choose the signals

Your strongest signal is **Recent failure rate** (failures in the last 10 lots for the part and supplier). Its rule: Exclude the lot being scored. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.61% of the test period) and labels arrive weeks late. A model that always answers no would be 99.39% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.555 and finds 69.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.736 and 76.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.61% |
| Baseline PR-AUC | 0.555 |
| Baseline recall at 0.5% false positives | 69.5% |
| Challenger PR-AUC | 0.736 |
| Challenger recall at 0.5% false positives | 76.0% |

## 5. An edge case from the blueprint

**New supplier.** the supplier has no history. Planned response: Start at full inspection and relax with evidence. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 164353 |
| `positive_rate` | 0.0051961 |
| `test_rows` | 54068 |
| `test_positive_rate` | 0.0060849 |
| `baseline_lr.pr_auc` | 0.55452 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.69492 |
| `baseline_lr.brier` | 0.0052645 |
| `challenger_hgb.pr_auc` | 0.73634 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.75988 |
| `challenger_hgb.brier` | 0.0026168 |

</details>
