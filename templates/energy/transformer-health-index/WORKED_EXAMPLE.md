# Transformer Health Index: worked example

> Run on synthetic data with `tabular` engine, seed 43610, knobs {"n_entities": 2700, "positive_entity_rate": 0.022, "n_flash_sales": 5}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order.

**Constraints that shape the design.** Index with the top contributing factors; Calibrated failure probability within 5 years; Engineers can override with notes

**Label in this use case.** For "Transformer Health Index": Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age-only ranking.

## 2. Choose the signals

Your strongest signal is **Oil test results** (dissolved gas and moisture values). Its rule: From lab tests. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.38% of the test period) and labels arrive weeks late. A model that always answers no would be 99.62% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.659 and finds 74.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.739 and 78.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.38% |
| Baseline PR-AUC | 0.659 |
| Baseline recall at 0.5% false positives | 74.1% |
| Challenger PR-AUC | 0.739 |
| Challenger recall at 0.5% false positives | 78.2% |

## 5. An edge case from the blueprint

**Missing oil tests.** tests are years old. Planned response: Staleness flags and wider intervals. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 209047 |
| `positive_rate` | 0.0029563 |
| `test_rows` | 70652 |
| `test_positive_rate` | 0.0037649 |
| `baseline_lr.pr_auc` | 0.65947 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7406 |
| `baseline_lr.brier` | 0.0019831 |
| `challenger_hgb.pr_auc` | 0.73863 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78195 |
| `challenger_hgb.brier` | 0.0015762 |

</details>
