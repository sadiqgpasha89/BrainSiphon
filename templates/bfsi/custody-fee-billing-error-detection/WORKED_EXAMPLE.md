# Custody Fee & Billing Error Detection: worked example

> Run on synthetic data with `tabular` engine, seed 72063, knobs {"n_entities": 2520, "positive_entity_rate": 0.022, "n_flash_sales": 7}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust.

**Constraints that shape the design.** Review capacity of 300 invoices per cycle; Explainable flags; No changes to billing without approval

**Label in this use case.** For "Custody Fee & Billing Error Detection": Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past errors found by clients.

## 2. Choose the signals

Your strongest signal is **Fee recomputation gap** (invoiced fee minus recomputed fee). Its rule: Needs correct contract terms. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.21% of the test period) and labels arrive weeks late. A model that always answers no would be 99.79% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.542 and finds 69.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.626 and 74.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.21% |
| Baseline PR-AUC | 0.542 |
| Baseline recall at 0.5% false positives | 69.6% |
| Challenger PR-AUC | 0.626 |
| Challenger recall at 0.5% false positives | 74.1% |

## 5. An edge case from the blueprint

**Mid-month asset transfer.** A transfer part-way through the month makes the pro-rata fee wrong. Planned response: Check fees on a daily accrual basis and compare with the billed total. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 193331 |
| `positive_rate` | 0.0028035 |
| `test_rows` | 64475 |
| `test_positive_rate` | 0.0020938 |
| `baseline_lr.pr_auc` | 0.54182 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.6963 |
| `baseline_lr.brier` | 0.001675 |
| `challenger_hgb.pr_auc` | 0.62578 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74074 |
| `challenger_hgb.brier` | 0.001141 |

</details>
