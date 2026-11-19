# Closing Process Delay Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 2087, knobs {"n_entities": 2380, "positive_entity_rate": 0.021, "n_flash_sales": 4}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items.

**Constraints that shape the design.** Scores refreshed daily with the latest transaction status; Each score shows the reasons behind it; Output is a worklist of items to chase and not just a number

**Label in this use case.** For "Closing Process Delay Prediction": Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes after action, because coordinators chase risky deals and thereby change the result.

## 2. Choose the signals

Your strongest signal is **Outstanding conditions** (count of lender conditions not yet cleared). Its rule: Counts vary by lender, so normalise by loan type. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.18% of the test period) and labels arrive weeks late. A model that always answers no would be 99.82% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.388 and finds 59.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.568 and 65.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.18% |
| Baseline PR-AUC | 0.388 |
| Baseline recall at 0.5% false positives | 59.8% |
| Challenger PR-AUC | 0.568 |
| Challenger recall at 0.5% false positives | 65.4% |

## 5. An edge case from the blueprint

**Rate lock expiry.** A rate lock expires before closing and adds cost. Planned response: Flag locks that expire before the closing date and prompt the lender. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 180831 |
| `positive_rate` | 0.0026599 |
| `test_rows` | 60155 |
| `test_positive_rate` | 0.0017787 |
| `baseline_lr.pr_auc` | 0.38756 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.59813 |
| `baseline_lr.brier` | 0.0038791 |
| `challenger_hgb.pr_auc` | 0.56786 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.65421 |
| `challenger_hgb.brier` | 0.0010724 |

</details>
