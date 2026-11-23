# Permit Processing Time Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 88710, knobs {"n_entities": 2460, "positive_entity_rate": 0.029, "n_flash_sales": 5}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict how long each permit application will take so applicants get honest timelines and managers balance workloads.

**Constraints that shape the design.** Timeline range shown to applicants; Prediction recalculated at each stage; No effect on queue order

**Label in this use case.** For "Permit Processing Time Prediction": Predict how long each permit application will take so applicants get honest timelines and managers balance workloads. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Staff scoring.

## 2. Choose the signals

Your strongest signal is **Application type and size** (permit class and project size). Its rule: From the application. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.41% of the test period) and labels arrive weeks late. A model that always answers no would be 99.59% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.761 and finds 77.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.805 and 83.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.41% |
| Baseline PR-AUC | 0.761 |
| Baseline recall at 0.5% false positives | 77.7% |
| Challenger PR-AUC | 0.805 |
| Challenger recall at 0.5% false positives | 83.4% |

## 5. An edge case from the blueprint

**Policy backlog.** a rule change adds work. Planned response: Backlog features and alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 192937 |
| `positive_rate` | 0.0039339 |
| `test_rows` | 65217 |
| `test_positive_rate` | 0.0040634 |
| `baseline_lr.pr_auc` | 0.76093 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77736 |
| `baseline_lr.brier` | 0.0020898 |
| `challenger_hgb.pr_auc` | 0.80462 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83396 |
| `challenger_hgb.brier` | 0.0013977 |

</details>
