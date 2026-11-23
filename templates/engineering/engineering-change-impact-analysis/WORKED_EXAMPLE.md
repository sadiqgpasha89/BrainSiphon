# Engineering Change Impact Analysis: worked example

> Run on synthetic data with `tabular` engine, seed 40227, knobs {"n_entities": 2800, "positive_entity_rate": 0.031, "n_flash_sales": 7}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact.

**Constraints that shape the design.** Impacted items shown with the path from the change; Change board decides; Cost and schedule effect shown as ranges

**Label in this use case.** For "Engineering Change Impact Analysis": Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Text-only impact.

## 2. Choose the signals

Your strongest signal is **Item dependency graph** (parts, drawings and tests linked). Its rule: From the PLM. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.34% of the test period) and labels arrive weeks late. A model that always answers no would be 99.66% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.648 and finds 73.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.703 and 75.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.34% |
| Baseline PR-AUC | 0.648 |
| Baseline recall at 0.5% false positives | 73.3% |
| Challenger PR-AUC | 0.703 |
| Challenger recall at 0.5% false positives | 75.7% |

## 5. An edge case from the blueprint

**Missing links.** the structure is incomplete. Planned response: Flag unlinked items. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 213925 |
| `positive_rate` | 0.0040341 |
| `test_rows` | 70947 |
| `test_positive_rate` | 0.0034251 |
| `baseline_lr.pr_auc` | 0.64784 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73251 |
| `baseline_lr.brier` | 0.001947 |
| `challenger_hgb.pr_auc` | 0.70275 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7572 |
| `challenger_hgb.brier` | 0.001508 |

</details>
