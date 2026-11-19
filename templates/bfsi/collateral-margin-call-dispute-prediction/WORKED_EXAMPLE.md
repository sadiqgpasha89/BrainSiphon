# Collateral Margin Call Dispute Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 76530, knobs {"n_entities": 1820, "positive_entity_rate": 0.038, "n_flash_sales": 6}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline.

**Constraints that shape the design.** Scores ready before the morning call cycle; Explanation per flagged call; Dispute handling follows the legal agreement

**Label in this use case.** For "Collateral Margin Call Dispute Prediction": Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Features captured after the reply.

## 2. Choose the signals

Your strongest signal is **Valuation gap to counterparty mark** (our mark minus the last agreed mark, scaled by notional). Its rule: Marks must be same-day. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.60% of the test period) and labels arrive weeks late. A model that always answers no would be 99.40% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.696 and finds 77.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.775 and 80.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.60% |
| Baseline PR-AUC | 0.696 |
| Baseline recall at 0.5% false positives | 77.6% |
| Challenger PR-AUC | 0.775 |
| Challenger recall at 0.5% false positives | 80.0% |

## 5. An edge case from the blueprint

**Month-end volatility.** many marks diverge at once. Planned response: Volatility regime flag and a wider review list. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 142671 |
| `positive_rate` | 0.0049695 |
| `test_rows` | 48268 |
| `test_positive_rate` | 0.0060081 |
| `baseline_lr.pr_auc` | 0.69598 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77586 |
| `baseline_lr.brier` | 0.0030979 |
| `challenger_hgb.pr_auc` | 0.77529 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8 |
| `challenger_hgb.brier` | 0.002397 |

</details>
