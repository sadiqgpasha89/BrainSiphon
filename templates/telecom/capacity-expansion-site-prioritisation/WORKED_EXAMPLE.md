# Capacity Expansion & Site Prioritisation: worked example

> Run on synthetic data with `tabular` engine, seed 83267, knobs {"n_entities": 2910, "positive_entity_rate": 0.028, "n_flash_sales": 3}, in 4.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which sites and carriers to upgrade within a capital budget by predicted congestion, revenue and quality impact so spend goes where users benefit most.

**Constraints that shape the design.** Budget and vendor lead-time constraints respected; Ranking explains the demand and quality drivers per site; Planners can override with a reason

**Label in this use case.** For "Capacity Expansion & Site Prioritisation": Choose which sites and carriers to upgrade within a capital budget by predicted congestion, revenue and quality impact so spend goes where users benefit most. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ranking by utilisation alone.

## 2. Choose the signals

Your strongest signal is **Forecast busy-hour utilisation** (forecast p95 utilisation at 6 and 12 months). Its rule: Quantiles from the traffic forecast. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.37% of the test period) and labels arrive weeks late. A model that always answers no would be 99.63% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.471 and finds 62.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.629 and 67.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.37% |
| Baseline PR-AUC | 0.471 |
| Baseline recall at 0.5% false positives | 62.8% |
| Challenger PR-AUC | 0.629 |
| Challenger recall at 0.5% false positives | 67.5% |

## 5. An edge case from the blueprint

**Demand forecast miss.** a site fills faster than expected. Planned response: Quarterly re-ranking and a watch list. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 221340 |
| `positive_rate` | 0.0035872 |
| `test_rows` | 73174 |
| `test_positive_rate` | 0.0037445 |
| `baseline_lr.pr_auc` | 0.47145 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.62774 |
| `baseline_lr.brier` | 0.0042672 |
| `challenger_hgb.pr_auc` | 0.62878 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.67518 |
| `challenger_hgb.brier` | 0.0018986 |

</details>
