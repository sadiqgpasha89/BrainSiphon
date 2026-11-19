# Predictive Test Selection: worked example

> Run on synthetic data with `tabular` engine, seed 66863, knobs {"n_entities": 2610, "positive_entity_rate": 0.043, "n_flash_sales": 3}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions.

**Constraints that shape the design.** Catch 99%+ of failures; Compute budget; Fresh test-failure history

**Label in this use case.** For "Predictive Test Selection": Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating with selected-only outcomes.

## 2. Choose the signals

Your strongest signal is **File-test co-failure history** (tests failing when file changed). Its rule: Window. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.47% of the test period) and labels arrive weeks late. A model that always answers no would be 99.53% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.589 and finds 70.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.732 and 74.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.47% |
| Baseline PR-AUC | 0.589 |
| Baseline recall at 0.5% false positives | 70.7% |
| Challenger PR-AUC | 0.732 |
| Challenger recall at 0.5% false positives | 74.8% |

## 5. An edge case from the blueprint

**New test with no history.** a brand-new test has no failure history, is never selected and its regressions escape. Planned response: Exploration slots and default inclusion for new tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 202478 |
| `positive_rate` | 0.005492 |
| `test_rows` | 67078 |
| `test_positive_rate` | 0.0046811 |
| `baseline_lr.pr_auc` | 0.58916 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.70701 |
| `baseline_lr.brier` | 0.0051213 |
| `challenger_hgb.pr_auc` | 0.73183 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74841 |
| `challenger_hgb.brier` | 0.0020418 |

</details>
