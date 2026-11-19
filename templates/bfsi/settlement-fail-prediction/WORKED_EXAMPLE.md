# Settlement Fail Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 40916, knobs {"n_entities": 2540, "positive_entity_rate": 0.031, "n_flash_sales": 6}, in 1.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early.

**Constraints that shape the design.** Predictions delivered by 04:00 for the settlement day; Explanation per flagged trade; Operations capacity of 500 chases a day

**Label in this use case.** For "Settlement Fail Prediction": Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using post-cut-off status.

## 2. Choose the signals

Your strongest signal is **Counterparty fail rate 30d** (fails divided by trades in 30 days by counterparty and market). Its rule: Window must end the previous day. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.43% of the test period) and labels arrive weeks late. A model that always answers no would be 99.57% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.675 and finds 77.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.761 and 80.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.43% |
| Baseline PR-AUC | 0.675 |
| Baseline recall at 0.5% false positives | 77.3% |
| Challenger PR-AUC | 0.761 |
| Challenger recall at 0.5% false positives | 80.6% |

## 5. An edge case from the blueprint

**Market holiday.** A market holiday shifts the settlement day and the features are computed for the wrong date. Planned response: Use a calendar service per market and compute every window against the real settlement date. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 195268 |
| `positive_rate` | 0.0041174 |
| `test_rows` | 65320 |
| `test_positive_rate` | 0.004256 |
| `baseline_lr.pr_auc` | 0.67535 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77338 |
| `baseline_lr.brier` | 0.0028243 |
| `challenger_hgb.pr_auc` | 0.76063 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80576 |
| `challenger_hgb.brier` | 0.0016647 |

</details>
