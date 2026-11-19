# Return Fraud & Policy Abuse Detection: worked example

> Run on synthetic data with `tabular` engine, seed 31936, knobs {"n_entities": 2290, "positive_entity_rate": 0.026, "n_flash_sales": 6}, in 2.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers.

**Constraints that shape the design.** Genuine customers must not be punished; Instant refund promise for trusted users; Decision in 80 ms

**Label in this use case.** For "Return Fraud & Policy Abuse Detection": Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from inspected returns.

## 2. Choose the signals

Your strongest signal is **Category-adjusted return rate** (customer rate over category peer rate). Its rule: Peer baseline per period. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.44% of the test period) and labels arrive weeks late. A model that always answers no would be 99.56% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.755 and finds 86.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.879 and 91.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.44% |
| Baseline PR-AUC | 0.755 |
| Baseline recall at 0.5% false positives | 86.0% |
| Challenger PR-AUC | 0.879 |
| Challenger recall at 0.5% false positives | 91.9% |

## 5. An edge case from the blueprint

**Policy change extends return windows.** baseline return rates shift. Planned response: Policy-version covariate and re-baselining. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 174268 |
| `positive_rate` | 0.0036323 |
| `test_rows` | 58420 |
| `test_positive_rate` | 0.0044163 |
| `baseline_lr.pr_auc` | 0.75486 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.86047 |
| `baseline_lr.brier` | 0.0029932 |
| `challenger_hgb.pr_auc` | 0.87915 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.9186 |
| `challenger_hgb.brier` | 0.0011649 |

</details>
