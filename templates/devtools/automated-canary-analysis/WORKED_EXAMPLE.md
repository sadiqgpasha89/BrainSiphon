# Automated Canary Analysis: worked example

> Run on synthetic data with `tabular` engine, seed 27353, knobs {"n_entities": 2110, "positive_entity_rate": 0.027, "n_flash_sales": 8}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm.

**Constraints that shape the design.** Decision recommended within 10 minutes of rollout step; Rollback is always a one-click human action; Statistical tests with multiple-testing control

**Label in this use case.** For "Automated Canary Analysis": Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Before-and-after comparisons.

## 2. Choose the signals

Your strongest signal is **Error rate difference** (canary versus baseline errors). Its rule: From metrics. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.36% of the test period) and labels arrive weeks late. A model that always answers no would be 99.64% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.741 and finds 84.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.812 and 87.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.36% |
| Baseline PR-AUC | 0.741 |
| Baseline recall at 0.5% false positives | 84.5% |
| Challenger PR-AUC | 0.812 |
| Challenger recall at 0.5% false positives | 87.6% |

## 5. An edge case from the blueprint

**Low traffic.** not enough requests. Planned response: Longer observation and a wider decision window. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 160799 |
| `positive_rate` | 0.0038371 |
| `test_rows` | 53551 |
| `test_positive_rate` | 0.0036227 |
| `baseline_lr.pr_auc` | 0.74126 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84514 |
| `baseline_lr.brier` | 0.0016227 |
| `challenger_hgb.pr_auc` | 0.812 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.87629 |
| `challenger_hgb.brier` | 0.0013831 |

</details>
