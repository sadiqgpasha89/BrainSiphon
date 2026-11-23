# Maintenance Window Scheduling: worked example

> Run on synthetic data with `tabular` engine, seed 34801, knobs {"n_entities": 2360, "positive_entity_rate": 0.044, "n_flash_sales": 6}, in 3.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval.

**Constraints that shape the design.** Windows avoid freeze periods and peak traffic; Owners approve each window; Dependencies scheduled in order

**Label in this use case.** For "Maintenance Window Scheduling": Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Habit-based windows.

## 2. Choose the signals

Your strongest signal is **Traffic forecast by hour** (expected load). Its rule: From capacity forecasts. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.52% of the test period) and labels arrive weeks late. A model that always answers no would be 99.48% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.720 and finds 77.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.830 and 85.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.52% |
| Baseline PR-AUC | 0.720 |
| Baseline recall at 0.5% false positives | 77.3% |
| Challenger PR-AUC | 0.830 |
| Challenger recall at 0.5% false positives | 85.9% |

## 5. An edge case from the blueprint

**Global user base.** no quiet hour exists. Planned response: Rolling windows by region. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 181357 |
| `positive_rate` | 0.0058724 |
| `test_rows` | 60325 |
| `test_positive_rate` | 0.0051886 |
| `baseline_lr.pr_auc` | 0.72047 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77316 |
| `baseline_lr.brier` | 0.0055263 |
| `challenger_hgb.pr_auc` | 0.83029 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.85942 |
| `challenger_hgb.brier` | 0.0016976 |

</details>
