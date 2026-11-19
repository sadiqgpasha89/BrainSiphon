# Credit Model Drift & Fairness Monitoring: worked example

> Run on synthetic data with `tabular` engine, seed 85364, knobs {"n_entities": 2540, "positive_entity_rate": 0.031, "n_flash_sales": 4}, in 1.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports.

**Constraints that shape the design.** Regulator-grade documentation; Delayed outcomes; Protected-class data governance

**Label in this use case.** For "Credit Model Drift & Fairness Monitoring": Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using immature cohorts as performance evidence.

## 2. Choose the signals

Your strongest signal is **Population stability by feature** (PSI per feature and score). Its rule: Reference window fixed by model version. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.44% of the test period) and labels arrive weeks late. A model that always answers no would be 99.56% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.473 and finds 75.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.792 and 79.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.44% |
| Baseline PR-AUC | 0.473 |
| Baseline recall at 0.5% false positives | 75.9% |
| Challenger PR-AUC | 0.792 |
| Challenger recall at 0.5% false positives | 79.0% |

## 5. An edge case from the blueprint

**Policy change shifts population.** alerts fire constantly. Planned response: Policy-version stratification and re-baselining protocol. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 194256 |
| `positive_rate` | 0.0044992 |
| `test_rows` | 65324 |
| `test_positive_rate` | 0.0043782 |
| `baseline_lr.pr_auc` | 0.47277 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75874 |
| `baseline_lr.brier` | 0.0050485 |
| `challenger_hgb.pr_auc` | 0.79202 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79021 |
| `challenger_hgb.brier` | 0.00153 |

</details>
