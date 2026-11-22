# Physician Schedule Fairness Analytics: worked example

> Run on synthetic data with `tabular` engine, seed 11623, knobs {"n_entities": 2280, "positive_entity_rate": 0.026, "n_flash_sales": 7}, in 10.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders.

**Constraints that shape the design.** Leaders interpret context and approve adjustments and the analytics make no employment decision; Comparisons are within groups defined by leadership and adjusted for FTE and approved exceptions; Sensitive employment and demographic data are restricted and aggregated where small groups could identify a person

**Label in this use case.** For "Physician Schedule Fairness Analytics": Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ranking individual physicians.

## 2. Choose the signals

Your strongest signal is **Burden index** (weighted count of nights, weekends, holidays and call per FTE). Its rule: Actual schedule. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.33% of the test period) and labels arrive weeks late. A model that always answers no would be 99.67% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.758 and finds 84.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.779 and 84.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.33% |
| Baseline PR-AUC | 0.758 |
| Baseline recall at 0.5% false positives | 84.2% |
| Challenger PR-AUC | 0.779 |
| Challenger recall at 0.5% false positives | 84.7% |

## 5. An edge case from the blueprint

**Very small group.** individuals are identifiable. Planned response: Suppression and pooling rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 177414 |
| `positive_rate` | 0.0033932 |
| `test_rows` | 59103 |
| `test_positive_rate` | 0.0033162 |
| `baseline_lr.pr_auc` | 0.75778 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84184 |
| `baseline_lr.brier` | 0.0014725 |
| `challenger_hgb.pr_auc` | 0.77869 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84694 |
| `challenger_hgb.brier` | 0.0011888 |

</details>
