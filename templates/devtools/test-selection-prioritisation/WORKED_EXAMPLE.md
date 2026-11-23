# Test Selection and Prioritisation: worked example

> Run on synthetic data with `tabular` engine, seed 45972, knobs {"n_entities": 2730, "positive_entity_rate": 0.044, "n_flash_sales": 6}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely.

**Constraints that shape the design.** Catch at least 99% of failing changes within the selected tests; Full suite still runs before release; Selection within 5 s

**Label in this use case.** For "Test Selection and Prioritisation": Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Selection with no full run.

## 2. Choose the signals

Your strongest signal is **Files changed and test mapping** (tests linked to changed files). Its rule: From coverage maps. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.63% of the test period) and labels arrive weeks late. A model that always answers no would be 99.37% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.673 and finds 78.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.816 and 83.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.63% |
| Baseline PR-AUC | 0.673 |
| Baseline recall at 0.5% false positives | 78.1% |
| Challenger PR-AUC | 0.816 |
| Challenger recall at 0.5% false positives | 83.6% |

## 5. An edge case from the blueprint

**Test environment changes.** failures occur with no code link. Planned response: Environment tags and full runs. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 209176 |
| `positive_rate` | 0.0058898 |
| `test_rows` | 69567 |
| `test_positive_rate` | 0.0062961 |
| `baseline_lr.pr_auc` | 0.67331 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78082 |
| `baseline_lr.brier` | 0.0056942 |
| `challenger_hgb.pr_auc` | 0.81553 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83562 |
| `challenger_hgb.brier` | 0.0021965 |

</details>
