# Coverage Hole Detection from Crowd Measurements: worked example

> Run on synthetic data with `tabular` engine, seed 32162, knobs {"n_entities": 2340, "positive_entity_rate": 0.025, "n_flash_sales": 5}, in 3.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in.

**Constraints that shape the design.** Device measurements aggregated and k-anonymised before analysis; No individual subscriber location history stored; Grid resolution of 50 m in dense areas

**Label in this use case.** For "Coverage Hole Detection from Crowd Measurements": Find locations with weak or absent coverage from anonymised device measurements and drive-test data, so planning targets the areas that users actually struggle in. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating sample counts as demand.

## 2. Choose the signals

Your strongest signal is **Weak-signal share** (share of measurements below the coverage threshold per grid). Its rule: Needs enough samples per tile. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.752 and finds 79.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.754 and 79.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.752 |
| Baseline recall at 0.5% false positives | 79.0% |
| Challenger PR-AUC | 0.754 |
| Challenger recall at 0.5% false positives | 79.0% |

## 5. An edge case from the blueprint

**Sparse area.** too few samples to score. Planned response: Report unknown not good and schedule a drive test. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 182768 |
| `positive_rate` | 0.0036275 |
| `test_rows` | 60511 |
| `test_positive_rate` | 0.0039332 |
| `baseline_lr.pr_auc` | 0.75203 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78992 |
| `baseline_lr.brier` | 0.0015401 |
| `challenger_hgb.pr_auc` | 0.75446 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78992 |
| `challenger_hgb.brier` | 0.0017209 |

</details>
