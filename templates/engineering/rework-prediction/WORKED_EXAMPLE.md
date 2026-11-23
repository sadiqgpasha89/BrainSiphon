# Rework Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 41971, knobs {"n_entities": 2610, "positive_entity_rate": 0.044, "n_flash_sales": 4}, in 3.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built.

**Constraints that shape the design.** Alerts at least 1 week before work starts; Work package level only; Quality managers decide on extra checks

**Label in this use case.** For "Rework Prediction": Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Crew ranking.

## 2. Choose the signals

Your strongest signal is **Design maturity** (open clashes and late revisions). Its rule: From the model and register. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.55% of the test period) and labels arrive weeks late. A model that always answers no would be 99.45% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.679 and finds 70.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.775 and 78.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.55% |
| Baseline PR-AUC | 0.679 |
| Baseline recall at 0.5% false positives | 70.7% |
| Challenger PR-AUC | 0.775 |
| Challenger recall at 0.5% false positives | 78.0% |

## 5. An edge case from the blueprint

**New work type.** there is no history. Planned response: Similar work analogues. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 203352 |
| `positive_rate` | 0.0056208 |
| `test_rows` | 67474 |
| `test_positive_rate` | 0.0055132 |
| `baseline_lr.pr_auc` | 0.67948 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.70699 |
| `baseline_lr.brier` | 0.0040883 |
| `challenger_hgb.pr_auc` | 0.77542 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77957 |
| `challenger_hgb.brier` | 0.0020957 |

</details>
