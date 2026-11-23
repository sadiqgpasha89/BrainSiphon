# Bill Shock Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 23244, knobs {"n_entities": 1990, "positive_entity_rate": 0.036, "n_flash_sales": 7}, in 3.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early.

**Constraints that shape the design.** Prediction at least 10 days before bill issue; Reason code with every flag; Outreach is an offer of help never a penalty

**Label in this use case.** For "Bill Shock Prediction": Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Flagging seasonal rises.

## 2. Choose the signals

Your strongest signal is **Consumption against the same month last year** (change in usage for the same period). Its rule: Weather adjusted. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.54% of the test period) and labels arrive weeks late. A model that always answers no would be 99.46% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.737 and finds 81.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.807 and 81.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.54% |
| Baseline PR-AUC | 0.737 |
| Baseline recall at 0.5% false positives | 81.2% |
| Challenger PR-AUC | 0.807 |
| Challenger recall at 0.5% false positives | 81.7% |

## 5. An edge case from the blueprint

**Estimated reads.** a catch-up read arrives late. Planned response: Estimated flags and an early notice. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 153478 |
| `positive_rate` | 0.0052776 |
| `test_rows` | 52399 |
| `test_positive_rate` | 0.00542 |
| `baseline_lr.pr_auc` | 0.73696 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81164 |
| `baseline_lr.brier` | 0.0060447 |
| `challenger_hgb.pr_auc` | 0.80678 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8169 |
| `challenger_hgb.brier` | 0.0018041 |

</details>
