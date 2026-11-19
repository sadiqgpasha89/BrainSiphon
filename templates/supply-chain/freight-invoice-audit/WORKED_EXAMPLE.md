# Freight Invoice Audit & Overcharge Detection: worked example

> Run on synthetic data with `tabular` engine, seed 44373, knobs {"n_entities": 2120, "positive_entity_rate": 0.022, "n_flash_sales": 6}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment.

**Constraints that shape the design.** Contract versions; Accessorial dispute evidence; Payment cycle deadlines

**Label in this use case.** For "Freight Invoice Audit & Overcharge Detection": Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on invoices already audited.

## 2. Choose the signals

Your strongest signal is **Expected-rate delta** (invoice minus computed contract rate). Its rule: Contract version. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.29% of the test period) and labels arrive weeks late. A model that always answers no would be 99.71% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.661 and finds 76.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.714 and 83.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.29% |
| Baseline PR-AUC | 0.661 |
| Baseline recall at 0.5% false positives | 76.1% |
| Challenger PR-AUC | 0.714 |
| Challenger recall at 0.5% false positives | 83.2% |

## 5. An edge case from the blueprint

**Contract amendments mid-year.** wrong rate computed. Planned response: Effective-date contract store. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 161330 |
| `positive_rate` | 0.0031302 |
| `test_rows` | 53934 |
| `test_positive_rate` | 0.0028739 |
| `baseline_lr.pr_auc` | 0.661 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.76129 |
| `baseline_lr.brier` | 0.0019111 |
| `challenger_hgb.pr_auc` | 0.71357 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83226 |
| `challenger_hgb.brier` | 0.0012517 |

</details>
