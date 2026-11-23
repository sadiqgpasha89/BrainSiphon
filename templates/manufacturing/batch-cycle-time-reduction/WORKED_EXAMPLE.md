# Batch Cycle-Time Reduction: worked example

> Run on synthetic data with `tabular` engine, seed 21617, knobs {"n_entities": 2520, "positive_entity_rate": 0.032, "n_flash_sales": 6}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality.

**Constraints that shape the design.** Quality limits are not relaxed; Recommendations reviewed by process engineers; Cycle time predictions with intervals

**Label in this use case.** For "Batch Cycle-Time Reduction": Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising time without quality.

## 2. Choose the signals

Your strongest signal is **Early reaction rate indicators** (slope of temperature and conversion in the first phase). Its rule: Per recipe. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.57% of the test period) and labels arrive weeks late. A model that always answers no would be 99.43% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.748 and finds 75.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.768 and 76.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.57% |
| Baseline PR-AUC | 0.748 |
| Baseline recall at 0.5% false positives | 75.5% |
| Challenger PR-AUC | 0.768 |
| Challenger recall at 0.5% false positives | 76.6% |

## 5. An edge case from the blueprint

**New raw material supplier.** the properties change. Planned response: Supplier features and a conservative interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 187181 |
| `positive_rate` | 0.0043701 |
| `test_rows` | 62209 |
| `test_positive_rate` | 0.0057066 |
| `baseline_lr.pr_auc` | 0.74846 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75493 |
| `baseline_lr.brier` | 0.0023993 |
| `challenger_hgb.pr_auc` | 0.76777 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7662 |
| `challenger_hgb.brier` | 0.0024629 |

</details>
