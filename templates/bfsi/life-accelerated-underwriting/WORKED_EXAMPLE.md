# Life Insurance Accelerated Underwriting: worked example

> Run on synthetic data with `tabular` engine, seed 33441, knobs {"n_entities": 2250, "positive_entity_rate": 0.021, "n_flash_sales": 4}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting.

**Constraints that shape the design.** Mortality-slippage budget set by the actuary; Fair-treatment rules; Explainable declines

**Label in this use case.** For "Life Insurance Accelerated Underwriting": Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only for accepted applicants.

## 2. Choose the signals

Your strongest signal is **Disclosure consistency** (answers versus prescription and records). Its rule: Data coverage. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.435 and finds 76.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.717 and 71.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.435 |
| Baseline recall at 0.5% false positives | 76.4% |
| Challenger PR-AUC | 0.717 |
| Challenger recall at 0.5% false positives | 71.9% |

## 5. An edge case from the blueprint

**Data provider outage.** A data provider outage leaves key inputs missing for an applicant. Planned response: Refer the application to full underwriting instead of imputing, and log the outage for monitoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 169835 |
| `positive_rate` | 0.0029735 |
| `test_rows` | 56992 |
| `test_positive_rate` | 0.0039304 |
| `baseline_lr.pr_auc` | 0.43532 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.76392 |
| `baseline_lr.brier` | 0.0066846 |
| `challenger_hgb.pr_auc` | 0.71698 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.71875 |
| `challenger_hgb.brier` | 0.0017138 |

</details>
