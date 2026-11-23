# Records System Misuse Detection: worked example

> Run on synthetic data with `tabular` engine, seed 26081, knobs {"n_entities": 2490, "positive_entity_rate": 0.025, "n_flash_sales": 5}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review.

**Constraints that shape the design.** Leads reviewed by professional standards staff; No action from a score alone; Case link and purpose checks first

**Label in this use case.** For "Records System Misuse Detection": Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Action from scores.

## 2. Choose the signals

Your strongest signal is **Case link present** (whether a case or purpose is recorded). Its rule: From logs. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.33% of the test period) and labels arrive weeks late. A model that always answers no would be 99.67% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.675 and finds 73.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.710 and 75.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.33% |
| Baseline PR-AUC | 0.675 |
| Baseline recall at 0.5% false positives | 73.1% |
| Challenger PR-AUC | 0.710 |
| Challenger recall at 0.5% false positives | 75.0% |

## 5. An edge case from the blueprint

**Shift work.** access at night is normal. Planned response: Role and shift features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 190949 |
| `positive_rate` | 0.0032784 |
| `test_rows` | 63864 |
| `test_positive_rate` | 0.0032569 |
| `baseline_lr.pr_auc` | 0.67544 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73077 |
| `baseline_lr.brier` | 0.0017001 |
| `challenger_hgb.pr_auc` | 0.71049 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.75 |
| `challenger_hgb.brier` | 0.0014265 |

</details>
