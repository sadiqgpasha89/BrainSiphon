# Duplicate and Near-Duplicate Code Detection: worked example

> Run on synthetic data with `tabular` engine, seed 33935, knobs {"n_entities": 2150, "positive_entity_rate": 0.028, "n_flash_sales": 4}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls.

**Constraints that shape the design.** Clusters shown with the files and differences; Owners decide whether to merge; Generated code and licences excluded

**Label in this use case.** For "Duplicate and Near-Duplicate Code Detection": Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Text-equality detectors.

## 2. Choose the signals

Your strongest signal is **Token and syntax tree similarity** (structural similarity). Its rule: From parsers. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.25% of the test period) and labels arrive weeks late. A model that always answers no would be 99.75% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.555 and finds 79.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.763 and 79.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.25% |
| Baseline PR-AUC | 0.555 |
| Baseline recall at 0.5% false positives | 79.2% |
| Challenger PR-AUC | 0.763 |
| Challenger recall at 0.5% false positives | 79.9% |

## 5. An edge case from the blueprint

**Generated code.** duplicates are generated. Planned response: Path exclusions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 167834 |
| `positive_rate` | 0.0035035 |
| `test_rows` | 57483 |
| `test_positive_rate` | 0.0025051 |
| `baseline_lr.pr_auc` | 0.5552 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.79167 |
| `baseline_lr.brier` | 0.0024055 |
| `challenger_hgb.pr_auc` | 0.76342 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79861 |
| `challenger_hgb.brier` | 0.00097307 |

</details>
