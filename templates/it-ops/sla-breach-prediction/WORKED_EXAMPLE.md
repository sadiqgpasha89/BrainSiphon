# SLA Breach Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 62689, knobs {"n_entities": 1940, "positive_entity_rate": 0.025, "n_flash_sales": 7}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance.

**Constraints that shape the design.** Alerts at least 2 hours before a breach; Team-level actions only; Calibrated probabilities

**Label in this use case.** For "SLA Breach Prediction": Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual agent pressure.

## 2. Choose the signals

Your strongest signal is **Time remaining versus predicted work** (clock and estimated effort). Its rule: From the ITSM. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.25% of the test period) and labels arrive weeks late. A model that always answers no would be 99.75% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.656 and finds 71.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.639 and 70.9%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.25% |
| Baseline PR-AUC | 0.656 |
| Baseline recall at 0.5% false positives | 71.7% |
| Challenger PR-AUC | 0.639 |
| Challenger recall at 0.5% false positives | 70.9% |

## 5. An edge case from the blueprint

**Surge of tickets.** queue volume jumps after an outage. Planned response: Surge mode with wider alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 150635 |
| `positive_rate` | 0.0032197 |
| `test_rows` | 51465 |
| `test_positive_rate` | 0.0024677 |
| `baseline_lr.pr_auc` | 0.65561 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71654 |
| `baseline_lr.brier` | 0.0011886 |
| `challenger_hgb.pr_auc` | 0.63944 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.70866 |
| `challenger_hgb.brier` | 0.0012777 |

</details>
