# Static Analysis False Positive Reduction: worked example

> Run on synthetic data with `tabular` engine, seed 65957, knobs {"n_entities": 2620, "positive_entity_rate": 0.023, "n_flash_sales": 3}, in 3.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available.

**Constraints that shape the design.** Hidden findings stay one click away; Recall of true vulnerabilities above 98% at the shown threshold; Security team reviews threshold changes

**Label in this use case.** For "Static Analysis False Positive Reduction": Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Hiding alerts silently.

## 2. Choose the signals

Your strongest signal is **Rule and language** (the analysis rule and language). Its rule: From the scanner. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.31% of the test period) and labels arrive weeks late. A model that always answers no would be 99.69% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.514 and finds 64.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.698 and 75.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.31% |
| Baseline PR-AUC | 0.514 |
| Baseline recall at 0.5% false positives | 64.6% |
| Challenger PR-AUC | 0.698 |
| Challenger recall at 0.5% false positives | 75.5% |

## 5. An edge case from the blueprint

**New rule.** no triage history exists. Planned response: Show all findings for new rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 203588 |
| `positive_rate` | 0.0029619 |
| `test_rows` | 67814 |
| `test_positive_rate` | 0.0031262 |
| `baseline_lr.pr_auc` | 0.51393 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.64623 |
| `baseline_lr.brier` | 0.0035661 |
| `challenger_hgb.pr_auc` | 0.69783 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.75472 |
| `challenger_hgb.brier` | 0.0014472 |

</details>
