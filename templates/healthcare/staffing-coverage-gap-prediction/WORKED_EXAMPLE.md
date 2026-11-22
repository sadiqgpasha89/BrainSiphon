# Staffing Coverage Gap Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 15545, knobs {"n_entities": 2050, "positive_entity_rate": 0.03, "n_flash_sales": 7}, in 9.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift.

**Constraints that shape the design.** Scores every future shift in a 14-day window each night; Coverage is evaluated by a deterministic rule engine and the model only ranks risk; Confirmed uncovered shifts are reported separately from predicted gaps

**Label in this use case.** For "Staffing Coverage Gap Prediction": Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting filled shifts as false positives.

## 2. Choose the signals

Your strongest signal is **Open-shift age and fill hazard** (hours since posting and historical fill rate for that role and shift type). Its rule: Use posting time and fill time as logged. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.42% of the test period) and labels arrive weeks late. A model that always answers no would be 99.58% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.590 and finds 74.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.589 and 68.0%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.42% |
| Baseline PR-AUC | 0.590 |
| Baseline recall at 0.5% false positives | 74.0% |
| Challenger PR-AUC | 0.589 |
| Challenger recall at 0.5% false positives | 68.0% |

## 5. An edge case from the blueprint

**Credential lapses between scoring and shift.** a cover option becomes ineligible. Planned response: Re-check eligibility at the moment of recommendation and again at assignment. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 158821 |
| `positive_rate` | 0.0034756 |
| `test_rows` | 52750 |
| `test_positive_rate` | 0.0041517 |
| `baseline_lr.pr_auc` | 0.58972 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.73973 |
| `baseline_lr.brier` | 0.0023224 |
| `challenger_hgb.pr_auc` | 0.58929 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.68037 |
| `challenger_hgb.brier` | 0.0024213 |

</details>
