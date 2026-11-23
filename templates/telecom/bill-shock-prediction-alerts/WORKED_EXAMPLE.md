# Bill Shock Prediction & Alerts: worked example

> Run on synthetic data with `tabular` engine, seed 77447, knobs {"n_entities": 2000, "positive_entity_rate": 0.045, "n_flash_sales": 6}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall.

**Constraints that shape the design.** Alerts only through the customer's chosen channel; Alert cadence capped; No pressure to buy a higher plan

**Label in this use case.** For "Bill Shock Prediction & Alerts": Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using population averages.

## 2. Choose the signals

Your strongest signal is **Usage to date versus history** (usage so far in the cycle against the same point in prior cycles). Its rule: Align by cycle day. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.49% of the test period) and labels arrive weeks late. A model that always answers no would be 99.51% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.685 and finds 76.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.767 and 77.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.49% |
| Baseline PR-AUC | 0.685 |
| Baseline recall at 0.5% false positives | 76.0% |
| Challenger PR-AUC | 0.767 |
| Challenger recall at 0.5% false positives | 77.9% |

## 5. An edge case from the blueprint

**Customer on holiday.** roaming appears suddenly. Planned response: Roaming alerts at first foreign use. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 158489 |
| `positive_rate` | 0.0052811 |
| `test_rows` | 52411 |
| `test_positive_rate` | 0.0049226 |
| `baseline_lr.pr_auc` | 0.68529 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75969 |
| `baseline_lr.brier` | 0.0033834 |
| `challenger_hgb.pr_auc` | 0.76726 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77907 |
| `challenger_hgb.brier` | 0.0018628 |

</details>
