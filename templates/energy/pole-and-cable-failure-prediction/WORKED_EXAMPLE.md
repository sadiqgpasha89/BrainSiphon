# Pole and Cable Failure Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 45070, knobs {"n_entities": 1830, "positive_entity_rate": 0.026, "n_flash_sales": 8}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely.

**Constraints that shape the design.** Failure probability per segment for the next year; Inspection list within a fixed budget; Explanations on request

**Label in this use case.** For "Pole and Cable Failure Prediction": Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ignoring censoring.

## 2. Choose the signals

Your strongest signal is **Age and material** (age, species or insulation type). Its rule: From the register. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.606 and finds 78.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.726 and 77.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.606 |
| Baseline recall at 0.5% false positives | 78.4% |
| Challenger PR-AUC | 0.726 |
| Challenger recall at 0.5% false positives | 77.8% |

## 5. An edge case from the blueprint

**Missing install date.** the installation age is unknown. Planned response: Age estimation with a flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 138654 |
| `positive_rate` | 0.0034186 |
| `test_rows` | 46844 |
| `test_positive_rate` | 0.0039493 |
| `baseline_lr.pr_auc` | 0.60607 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78378 |
| `baseline_lr.brier` | 0.0046507 |
| `challenger_hgb.pr_auc` | 0.72637 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77838 |
| `challenger_hgb.brier` | 0.0017478 |

</details>
