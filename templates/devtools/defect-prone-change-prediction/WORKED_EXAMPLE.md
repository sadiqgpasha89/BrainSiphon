# Defect-Prone Change Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 82549, knobs {"n_entities": 2140, "positive_entity_rate": 0.025, "n_flash_sales": 5}, in 3.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors.

**Constraints that shape the design.** Change-level risk with drivers; No author-level scores; Used for review depth and test choice only

**Label in this use case.** For "Defect-Prone Change Prediction": Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Author-level scoring.

## 2. Choose the signals

Your strongest signal is **Change size and spread** (lines and files touched). Its rule: From the diff. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.591 and finds 69.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.590 and 63.4%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.591 |
| Baseline recall at 0.5% false positives | 69.9% |
| Challenger PR-AUC | 0.590 |
| Challenger recall at 0.5% false positives | 63.4% |

## 5. An edge case from the blueprint

**New repository.** no defect history. Planned response: Language-level priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 162298 |
| `positive_rate` | 0.0031054 |
| `test_rows` | 54186 |
| `test_positive_rate` | 0.0035249 |
| `baseline_lr.pr_auc` | 0.59138 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.69892 |
| `baseline_lr.brier` | 0.0021244 |
| `challenger_hgb.pr_auc` | 0.58992 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.63351 |
| `challenger_hgb.brier` | 0.0020766 |

</details>
