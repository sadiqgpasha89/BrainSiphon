# Test Gap Analysis from Changes and Coverage: worked example

> Run on synthetic data with `tabular` engine, seed 87074, knobs {"n_entities": 1830, "positive_entity_rate": 0.023, "n_flash_sales": 4}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most.

**Constraints that shape the design.** Gaps ranked by change risk and coverage; Links to the exact functions; Teams decide what to test

**Label in this use case.** For "Test Gap Analysis from Changes and Coverage": Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Coverage percentage targets.

## 2. Choose the signals

Your strongest signal is **Coverage by function** (tested share). Its rule: From coverage tools. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.19% of the test period) and labels arrive weeks late. A model that always answers no would be 99.81% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.611 and finds 72.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.684 and 80.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.19% |
| Baseline PR-AUC | 0.611 |
| Baseline recall at 0.5% false positives | 72.4% |
| Challenger PR-AUC | 0.684 |
| Challenger recall at 0.5% false positives | 80.5% |

## 5. An edge case from the blueprint

**Generated code.** coverage is misleading. Planned response: Exclusions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 140314 |
| `positive_rate` | 0.0032855 |
| `test_rows` | 46725 |
| `test_positive_rate` | 0.001862 |
| `baseline_lr.pr_auc` | 0.61104 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72414 |
| `baseline_lr.brier` | 0.0011687 |
| `challenger_hgb.pr_auc` | 0.68363 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8046 |
| `challenger_hgb.brier` | 0.00097428 |

</details>
