# Tenant Screening & Affordability Assessment: worked example

> Run on synthetic data with `tabular` engine, seed 39762, knobs {"n_entities": 2290, "positive_entity_rate": 0.038, "n_flash_sales": 3}, in 2.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.

**Constraints that shape the design.** Complies with fair-housing and credit-reporting law in each jurisdiction; Every decline or adverse action comes with specific, accurate reasons; No protected attributes or close proxies in features

**Label in this use case.** For "Tenant Screening & Affordability Assessment": Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones.

## 2. Choose the signals

Your strongest signal is **Rent-to-income ratio** (monthly rent divided by verified monthly gross income). Its rule: Only count income verified from a payroll or bank source. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.710 and finds 73.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.758 and 76.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.710 |
| Baseline recall at 0.5% false positives | 73.9% |
| Challenger PR-AUC | 0.758 |
| Challenger recall at 0.5% false positives | 76.9% |

## 5. An edge case from the blueprint

**No credit history.** An applicant with no credit history, such as a recent arrival, is scored as high risk. Planned response: Accept alternative evidence such as rent history and employer letters and route to human review. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 173473 |
| `positive_rate` | 0.0054994 |
| `test_rows` | 58579 |
| `test_positive_rate` | 0.0045067 |
| `baseline_lr.pr_auc` | 0.71027 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73864 |
| `baseline_lr.brier` | 0.0026523 |
| `challenger_hgb.pr_auc` | 0.75837 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76894 |
| `challenger_hgb.brier` | 0.0017467 |

</details>
