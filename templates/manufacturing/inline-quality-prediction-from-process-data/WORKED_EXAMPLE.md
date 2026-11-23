# Inline Quality Prediction from Process Data: worked example

> Run on synthetic data with `tabular` engine, seed 48517, knobs {"n_entities": 1810, "positive_entity_rate": 0.02, "n_flash_sales": 8}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added.

**Constraints that shape the design.** Prediction available before the next process step; Explanation of the top drivers shown to the operator; Model retrained on each new product family

**Label in this use case.** For "Inline Quality Prediction from Process Data": Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Averaging process data over the shift.

## 2. Choose the signals

Your strongest signal is **Parameter deviation from the recipe** (difference between actual and recipe values per step). Its rule: Align by step. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.30% of the test period) and labels arrive weeks late. A model that always answers no would be 99.70% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.872 and finds 92.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.827 and 88.4%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.30% |
| Baseline PR-AUC | 0.872 |
| Baseline recall at 0.5% false positives | 92.0% |
| Challenger PR-AUC | 0.827 |
| Challenger recall at 0.5% false positives | 88.4% |

## 5. An edge case from the blueprint

**New recipe.** no examples for the new settings. Planned response: Use physics-based priors and a conservative threshold. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 141571 |
| `positive_rate` | 0.0028113 |
| `test_rows` | 46595 |
| `test_positive_rate` | 0.0029617 |
| `baseline_lr.pr_auc` | 0.87232 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.92029 |
| `baseline_lr.brier` | 0.00083623 |
| `challenger_hgb.pr_auc` | 0.82697 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.88406 |
| `challenger_hgb.brier` | 0.00098887 |

</details>
