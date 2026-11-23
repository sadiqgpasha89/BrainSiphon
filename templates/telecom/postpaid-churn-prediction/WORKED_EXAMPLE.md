# Postpaid Churn Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 6289, knobs {"n_entities": 2570, "positive_entity_rate": 0.036, "n_flash_sales": 5}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost.

**Constraints that shape the design.** Offers capped by customer margin; Contact only within consent; Scores explained to retention agents

**Label in this use case.** For "Postpaid Churn Prediction": Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating all leaves as churn.

## 2. Choose the signals

Your strongest signal is **Experience score trend** (trend in the customer's network experience score). Its rule: Join with the experience score. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.37% of the test period) and labels arrive weeks late. A model that always answers no would be 99.63% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.645 and finds 79.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.781 and 83.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.37% |
| Baseline PR-AUC | 0.645 |
| Baseline recall at 0.5% false positives | 79.4% |
| Challenger PR-AUC | 0.781 |
| Challenger recall at 0.5% false positives | 83.8% |

## 5. An edge case from the blueprint

**Price rise month.** churn spikes for all. Planned response: Segment baseline adjustment and price-event features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 197459 |
| `positive_rate` | 0.0046643 |
| `test_rows` | 66840 |
| `test_positive_rate` | 0.0036954 |
| `baseline_lr.pr_auc` | 0.6454 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.79352 |
| `baseline_lr.brier` | 0.0027631 |
| `challenger_hgb.pr_auc` | 0.78079 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83806 |
| `challenger_hgb.brier` | 0.001447 |

</details>
