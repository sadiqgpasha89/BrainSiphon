# Dispatch Unit Recommendation: worked example

> Run on synthetic data with `tabular` engine, seed 70322, knobs {"n_entities": 2590, "positive_entity_rate": 0.031, "n_flash_sales": 4}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change.

**Constraints that shape the design.** Recommendation within 100 ms; Dispatcher decides every assignment; Capability and jurisdiction rules enforced

**Label in this use case.** For "Dispatch Unit Recommendation": Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic assignment.

## 2. Choose the signals

Your strongest signal is **Estimated travel time** (predicted arrival time). Its rule: From the routing engine. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.48% of the test period) and labels arrive weeks late. A model that always answers no would be 99.52% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.769 and finds 83.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.826 and 84.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.48% |
| Baseline PR-AUC | 0.769 |
| Baseline recall at 0.5% false positives | 83.3% |
| Challenger PR-AUC | 0.826 |
| Challenger recall at 0.5% false positives | 84.9% |

## 5. An edge case from the blueprint

**Stale unit status.** the unit has already moved. Planned response: Status freshness checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 198121 |
| `positive_rate` | 0.0042701 |
| `test_rows` | 65721 |
| `test_positive_rate` | 0.0048386 |
| `baseline_lr.pr_auc` | 0.76901 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.83333 |
| `baseline_lr.brier` | 0.0020633 |
| `challenger_hgb.pr_auc` | 0.8264 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84906 |
| `challenger_hgb.brier` | 0.0015743 |

</details>
