# Order Fallout Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 24514, knobs {"n_entities": 2980, "positive_entity_rate": 0.038, "n_flash_sales": 7}, in 4.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed.

**Constraints that shape the design.** Prediction at order entry and refreshed at each step; Top reasons shown to the fallout team; Precision above 50% on the top decile

**Label in this use case.** For "Order Fallout Prediction": Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final order state as a feature.

## 2. Choose the signals

Your strongest signal is **Product and component complexity** (number of components and dependencies in the order). Its rule: From the catalogue. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.663 and finds 70.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.715 and 73.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.663 |
| Baseline recall at 0.5% false positives | 70.7% |
| Challenger PR-AUC | 0.715 |
| Challenger recall at 0.5% false positives | 73.3% |

## 5. An edge case from the blueprint

**New product.** the new product has no history. Planned response: Start from a type-level prior and widen thresholds. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 234174 |
| `positive_rate` | 0.0049151 |
| `test_rows` | 79206 |
| `test_positive_rate` | 0.0044946 |
| `baseline_lr.pr_auc` | 0.66295 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.70731 |
| `baseline_lr.brier` | 0.0022402 |
| `challenger_hgb.pr_auc` | 0.71525 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.73315 |
| `challenger_hgb.brier` | 0.0020205 |

</details>
