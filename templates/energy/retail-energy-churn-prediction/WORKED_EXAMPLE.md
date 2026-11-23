# Retail Energy Churn Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 18375, knobs {"n_entities": 2150, "positive_entity_rate": 0.027, "n_flash_sales": 3}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan.

**Constraints that shape the design.** Churn probability for the next 90 days; Calibrated scores for offer budgets; Offers only to customers who have not been disadvantaged

**Label in this use case.** For "Retail Energy Churn Prediction": Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Targeting loyal customers with worse prices.

## 2. Choose the signals

Your strongest signal is **Price gap to the best market offer** (difference between current and best available price). Its rule: From market data. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.752 and finds 79.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.779 and 80.2%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.752 |
| Baseline recall at 0.5% false positives | 79.4% |
| Challenger PR-AUC | 0.779 |
| Challenger recall at 0.5% false positives | 80.2% |

## 5. An edge case from the blueprint

**Market price drop.** many customers become at risk at once. Planned response: Price-gap features and campaign capacity limits. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 164418 |
| `positive_rate` | 0.0039351 |
| `test_rows` | 55322 |
| `test_positive_rate` | 0.0044828 |
| `baseline_lr.pr_auc` | 0.75238 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.79404 |
| `baseline_lr.brier` | 0.0018546 |
| `challenger_hgb.pr_auc` | 0.77902 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80242 |
| `challenger_hgb.brier` | 0.0017159 |

</details>
