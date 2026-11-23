# Rightsizing Recommendations: worked example

> Run on synthetic data with `tabular` engine, seed 13082, knobs {"n_entities": 2290, "positive_entity_rate": 0.036, "n_flash_sales": 8}, in 3.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve.

**Constraints that shape the design.** Recommendations use peak and percentile usage; Owners approve every change; Savings shown with risk

**Label in this use case.** For "Rightsizing Recommendations": Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average utilisation.

## 2. Choose the signals

Your strongest signal is **Utilisation percentiles** (p95 and p99 of CPU and memory). Its rule: From monitoring. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.48% of the test period) and labels arrive weeks late. A model that always answers no would be 99.52% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.606 and finds 71.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.727 and 76.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.48% |
| Baseline PR-AUC | 0.606 |
| Baseline recall at 0.5% false positives | 71.0% |
| Challenger PR-AUC | 0.727 |
| Challenger recall at 0.5% false positives | 76.4% |

## 5. An edge case from the blueprint

**Short history.** a new resource lacks history. Planned response: Defer until enough data exists. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 176627 |
| `positive_rate` | 0.0047218 |
| `test_rows` | 57992 |
| `test_positive_rate` | 0.0048283 |
| `baseline_lr.pr_auc` | 0.60569 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71032 |
| `baseline_lr.brier` | 0.004182 |
| `challenger_hgb.pr_auc` | 0.72654 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76429 |
| `challenger_hgb.brier` | 0.0020817 |

</details>
