# Architecture Drift Detection: worked example

> Run on synthetic data with `tabular` engine, seed 54990, knobs {"n_entities": 2050, "positive_entity_rate": 0.024, "n_flash_sales": 4}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens.

**Constraints that shape the design.** Rules written as checks in CI; Violations linked to code and owners; Architects approve exceptions

**Label in this use case.** For "Architecture Drift Detection": Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Diagram-only governance.

## 2. Choose the signals

Your strongest signal is **Static dependency graph** (imports and calls). Its rule: From code analysis. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.751 and finds 87.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.780 and 87.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.751 |
| Baseline recall at 0.5% false positives | 87.1% |
| Challenger PR-AUC | 0.780 |
| Challenger recall at 0.5% false positives | 87.1% |

## 5. An edge case from the blueprint

**Dynamic calls.** static analysis misses links. Planned response: Runtime trace merge. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 155778 |
| `positive_rate` | 0.0040121 |
| `test_rows` | 51916 |
| `test_positive_rate` | 0.0038716 |
| `baseline_lr.pr_auc` | 0.75077 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.87065 |
| `baseline_lr.brier` | 0.0023674 |
| `challenger_hgb.pr_auc` | 0.77975 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.87065 |
| `challenger_hgb.brier` | 0.0014934 |

</details>
