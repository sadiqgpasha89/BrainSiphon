# Schedule Delay Risk Forecasting: worked example

> Run on synthetic data with `tabular` engine, seed 22395, knobs {"n_entities": 2380, "positive_entity_rate": 0.044, "n_flash_sales": 5}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on.

**Constraints that shape the design.** Forecast shown as a range with probabilities; Critical path drivers named; Baselines changed only through change control

**Label in this use case.** For "Schedule Delay Risk Forecasting": Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Planned dates as forecasts.

## 2. Choose the signals

Your strongest signal is **Progress and float** (completion and slack). Its rule: From the schedule. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.60% of the test period) and labels arrive weeks late. A model that always answers no would be 99.40% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.747 and finds 79.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.806 and 82.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.60% |
| Baseline PR-AUC | 0.747 |
| Baseline recall at 0.5% false positives | 79.0% |
| Challenger PR-AUC | 0.806 |
| Challenger recall at 0.5% false positives | 82.0% |

## 5. An edge case from the blueprint

**Re-baselined schedule.** the plan changes mid-project. Planned response: Baseline version tracking. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 187574 |
| `positive_rate` | 0.0055338 |
| `test_rows` | 62340 |
| `test_positive_rate` | 0.0059673 |
| `baseline_lr.pr_auc` | 0.7466 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.79032 |
| `baseline_lr.brier` | 0.0028294 |
| `challenger_hgb.pr_auc` | 0.80623 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.81989 |
| `challenger_hgb.brier` | 0.0022176 |

</details>
