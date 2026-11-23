# Tax Return Error Detection: worked example

> Run on synthetic data with `tabular` engine, seed 13253, knobs {"n_entities": 1890, "positive_entity_rate": 0.026, "n_flash_sales": 3}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk.

**Constraints that shape the design.** Prompt to the taxpayer about a possible error rather than a penalty; Auditors review any enforcement case; Selection based on random audits

**Label in this use case.** For "Tax Return Error Detection": Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past audit labels.

## 2. Choose the signals

Your strongest signal is **Third-party data mismatch** (differences with employer and bank reports). Its rule: From information returns. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.23% of the test period) and labels arrive weeks late. A model that always answers no would be 99.77% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.801 and finds 86.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.796 and 86.1%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.23% |
| Baseline PR-AUC | 0.801 |
| Baseline recall at 0.5% false positives | 86.1% |
| Challenger PR-AUC | 0.796 |
| Challenger recall at 0.5% false positives | 86.1% |

## 5. An edge case from the blueprint

**Law change.** a deduction rule changes. Planned response: Versioned rules and retraining. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 143370 |
| `positive_rate` | 0.0038851 |
| `test_rows` | 47178 |
| `test_positive_rate` | 0.0022892 |
| `baseline_lr.pr_auc` | 0.80079 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.86111 |
| `baseline_lr.brier` | 0.0010353 |
| `challenger_hgb.pr_auc` | 0.79648 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86111 |
| `challenger_hgb.brier` | 0.00082228 |

</details>
