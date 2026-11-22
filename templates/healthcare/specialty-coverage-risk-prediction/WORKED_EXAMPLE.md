# Specialty Coverage Risk Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 70919, knobs {"n_entities": 2120, "positive_entity_rate": 0.034, "n_flash_sales": 6}, in 9.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate.

**Constraints that shape the design.** Clinical operations validates contingency actions and the model never changes a schedule or contacts a physician; Minimum coverage rules are deterministic and the model estimates the chance of a breach; Each risk shows its cause and evidence

**Label in this use case.** For "Specialty Coverage Risk Prediction": Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting shortfalls that rules show.

## 2. Choose the signals

Your strongest signal is **Coverage depth** (qualified physicians available per slot beyond the minimum). Its rule: Roster snapshot. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.47% of the test period) and labels arrive weeks late. A model that always answers no would be 99.53% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.798 and finds 82.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.792 and 80.6%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.47% |
| Baseline PR-AUC | 0.798 |
| Baseline recall at 0.5% false positives | 82.0% |
| Challenger PR-AUC | 0.792 |
| Challenger recall at 0.5% false positives | 80.6% |

## 5. An edge case from the blueprint

**Rare specialty with few gaps.** the model has little data. Planned response: Specialty-group prior and a low-confidence flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 161927 |
| `positive_rate` | 0.004854 |
| `test_rows` | 54238 |
| `test_positive_rate` | 0.0046831 |
| `baseline_lr.pr_auc` | 0.79754 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82005 |
| `baseline_lr.brier` | 0.0016545 |
| `challenger_hgb.pr_auc` | 0.79183 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80575 |
| `challenger_hgb.brier` | 0.0018644 |

</details>
