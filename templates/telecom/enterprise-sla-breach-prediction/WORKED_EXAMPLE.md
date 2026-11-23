# Enterprise SLA Breach Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 24525, knobs {"n_entities": 2520, "positive_entity_rate": 0.034, "n_flash_sales": 5}, in 3.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall.

**Constraints that shape the design.** Per-contract SLA definitions applied exactly; Alerts to the account team with reasons; No automatic credits

**Label in this use case.** For "Enterprise SLA Breach Prediction": Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using one SLA formula.

## 2. Choose the signals

Your strongest signal is **SLA budget consumed** (minutes of downtime used against the allowed budget). Its rule: Contract rules applied. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.640 and finds 72.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.729 and 73.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.640 |
| Baseline recall at 0.5% false positives | 72.5% |
| Challenger PR-AUC | 0.729 |
| Challenger recall at 0.5% false positives | 73.5% |

## 5. An edge case from the blueprint

**Disputed outage.** SLA exclusion is unclear. Planned response: Mark disputed minutes and show both views. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 189927 |
| `positive_rate` | 0.0040752 |
| `test_rows` | 64364 |
| `test_positive_rate` | 0.0045212 |
| `baseline_lr.pr_auc` | 0.64035 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72509 |
| `baseline_lr.brier` | 0.0027373 |
| `challenger_hgb.pr_auc` | 0.72912 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7354 |
| `challenger_hgb.brier` | 0.0019008 |

</details>
