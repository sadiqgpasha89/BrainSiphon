# Carrier Selection & Tendering: worked example

> Run on synthetic data with `tabular` engine, seed 46825, knobs {"n_entities": 2220, "positive_entity_rate": 0.029, "n_flash_sales": 4}, in 2.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders.

**Constraints that shape the design.** Contract allocations; Tender time limits; Service-level agreements

**Label in this use case.** For "Carrier Selection & Tendering": Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logs only contain chosen carriers.

## 2. Choose the signals

Your strongest signal is **Carrier acceptance probability** (model per carrier-lane-day). Its rule: History. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.682 and finds 71.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.707 and 75.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.682 |
| Baseline recall at 0.5% false positives | 71.9% |
| Challenger PR-AUC | 0.707 |
| Challenger recall at 0.5% false positives | 75.1% |

## 5. An edge case from the blueprint

**Carrier changes bid behaviour after rate update.** acceptance model stale. Planned response: Fast retraining and drift alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 167083 |
| `positive_rate` | 0.003998 |
| `test_rows` | 54896 |
| `test_positive_rate` | 0.0035157 |
| `baseline_lr.pr_auc` | 0.68226 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71919 |
| `baseline_lr.brier` | 0.0017365 |
| `challenger_hgb.pr_auc` | 0.707 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7513 |
| `challenger_hgb.brier` | 0.0015799 |

</details>
