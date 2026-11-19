# Commercial Loan Covenant Breach Early Warning: worked example

> Run on synthetic data with `tabular` engine, seed 58855, knobs {"n_entities": 2020, "positive_entity_rate": 0.023, "n_flash_sales": 6}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach.

**Constraints that shape the design.** Predictions explainable to credit officers line by line; Quarterly cycle after statements arrive; No use of data the bank is not permitted to use for monitoring

**Label in this use case.** For "Commercial Loan Covenant Breach Early Warning": Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final accounts instead of as-reported ones inflates accuracy.

## 2. Choose the signals

Your strongest signal is **Covenant headroom and slope** (current ratio minus threshold, plus 4-quarter linear trend). Its rule: Use as-reported contractual definitions only. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.43% of the test period) and labels arrive weeks late. A model that always answers no would be 99.57% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.611 and finds 77.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.731 and 77.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.43% |
| Baseline PR-AUC | 0.611 |
| Baseline recall at 0.5% false positives | 77.1% |
| Challenger PR-AUC | 0.731 |
| Challenger recall at 0.5% false positives | 77.8% |

## 5. An edge case from the blueprint

**Waiver or amendment before breach.** breach never occurs because terms were changed. Planned response: Treat amendments as an event with its own label and exclude from negatives. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 153400 |
| `positive_rate` | 0.0030574 |
| `test_rows` | 52529 |
| `test_positive_rate` | 0.0042833 |
| `baseline_lr.pr_auc` | 0.61073 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77136 |
| `baseline_lr.brier` | 0.0073568 |
| `challenger_hgb.pr_auc` | 0.73145 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77778 |
| `challenger_hgb.brier` | 0.0021177 |

</details>
