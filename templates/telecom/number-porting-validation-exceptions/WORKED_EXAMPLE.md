# Number Porting Validation & Exceptions: worked example

> Run on synthetic data with `tabular` engine, seed 64232, knobs {"n_entities": 2340, "positive_entity_rate": 0.039, "n_flash_sales": 7}, in 3.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt.

**Constraints that shape the design.** Validation within 3 s of the request; Reasons mapped to the porting authority's rejection codes; No automatic cancellation of a customer request

**Label in this use case.** For "Number Porting Validation & Exceptions": Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating without reason codes.

## 2. Choose the signals

Your strongest signal is **Identifier match score** (match of name, account and number against the donor's record format). Its rule: Compare formats not raw values. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.541 and finds 69.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.754 and 76.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.541 |
| Baseline recall at 0.5% false positives | 69.0% |
| Challenger PR-AUC | 0.754 |
| Challenger recall at 0.5% false positives | 76.5% |

## 5. An edge case from the blueprint

**New donor operator.** no rejection history. Planned response: Use a pooled prior and monitor closely. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 178751 |
| `positive_rate` | 0.0050629 |
| `test_rows` | 59656 |
| `test_positive_rate` | 0.0051294 |
| `baseline_lr.pr_auc` | 0.54111 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.68954 |
| `baseline_lr.brier` | 0.0050093 |
| `challenger_hgb.pr_auc` | 0.75364 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.76471 |
| `challenger_hgb.brier` | 0.0020995 |

</details>
