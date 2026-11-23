# Material Delivery Lead Time Risk: worked example

> Run on synthetic data with `tabular` engine, seed 11303, knobs {"n_entities": 2840, "positive_entity_rate": 0.023, "n_flash_sales": 6}, in 4.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence.

**Constraints that shape the design.** Alerts at least 3 weeks before the needed date; Buyers decide on expediting; Calibrated probabilities

**Label in this use case.** For "Material Delivery Lead Time Risk": Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Promised date as label.

## 2. Choose the signals

Your strongest signal is **Supplier on-time history** (past delivery performance). Its rule: From procurement. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.37% of the test period) and labels arrive weeks late. A model that always answers no would be 99.63% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.621 and finds 75.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.741 and 77.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.37% |
| Baseline PR-AUC | 0.621 |
| Baseline recall at 0.5% false positives | 75.3% |
| Challenger PR-AUC | 0.741 |
| Challenger recall at 0.5% false positives | 77.7% |

## 5. An edge case from the blueprint

**Single-source item.** there is no alternative supplier. Planned response: Early engagement flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 213410 |
| `positive_rate` | 0.0032332 |
| `test_rows` | 71585 |
| `test_positive_rate` | 0.0037019 |
| `baseline_lr.pr_auc` | 0.62105 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75344 |
| `baseline_lr.brier` | 0.011049 |
| `challenger_hgb.pr_auc` | 0.74055 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77736 |
| `challenger_hgb.brier` | 0.00173 |

</details>
