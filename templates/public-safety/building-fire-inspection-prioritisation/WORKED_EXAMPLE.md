# Building Fire Inspection Prioritisation: worked example

> Run on synthetic data with `tabular` engine, seed 34797, knobs {"n_entities": 2780, "positive_entity_rate": 0.037, "n_flash_sales": 8}, in 3.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first.

**Constraints that shape the design.** Building-level risk with the drivers; Inspections by fire officers; Random visits kept to find model errors

**Label in this use case.** For "Building Fire Inspection Prioritisation": Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring occupants.

## 2. Choose the signals

Your strongest signal is **Building age and construction** (age, materials and height). Its rule: From the register. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.45% of the test period) and labels arrive weeks late. A model that always answers no would be 99.55% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.722 and finds 78.4% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.793 and 83.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.45% |
| Baseline PR-AUC | 0.722 |
| Baseline recall at 0.5% false positives | 78.4% |
| Challenger PR-AUC | 0.793 |
| Challenger recall at 0.5% false positives | 83.5% |

## 5. An edge case from the blueprint

**New building.** the building has no inspection history. Planned response: Occupancy-based priors and a first-visit rule. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 209605 |
| `positive_rate` | 0.0049713 |
| `test_rows` | 70601 |
| `test_positive_rate` | 0.0044759 |
| `baseline_lr.pr_auc` | 0.72152 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78356 |
| `baseline_lr.brier` | 0.0023898 |
| `challenger_hgb.pr_auc` | 0.79297 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83544 |
| `challenger_hgb.brier` | 0.0016646 |

</details>
