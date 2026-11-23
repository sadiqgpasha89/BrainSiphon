# Non-Technical Loss Detection: worked example

> Run on synthetic data with `tabular` engine, seed 16648, knobs {"n_entities": 2360, "positive_entity_rate": 0.032, "n_flash_sales": 5}, in 3.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals.

**Constraints that shape the design.** Analysis at transformer and feeder level first; Inspectors verify on site before any action; No customer is penalised on a score alone

**Label in this use case.** For "Non-Technical Loss Detection": Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual customer scoring.

## 2. Choose the signals

Your strongest signal is **Energy balance gap** (difference between supply and metered consumption). Its rule: By transformer. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.38% of the test period) and labels arrive weeks late. A model that always answers no would be 99.62% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.697 and finds 70.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.763 and 79.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.38% |
| Baseline PR-AUC | 0.697 |
| Baseline recall at 0.5% false positives | 70.0% |
| Challenger PR-AUC | 0.763 |
| Challenger recall at 0.5% false positives | 79.3% |

## 5. An edge case from the blueprint

**Meter data gaps.** balance errors appear. Planned response: Data quality checks before scoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 179217 |
| `positive_rate` | 0.0042909 |
| `test_rows` | 60339 |
| `test_positive_rate` | 0.0037621 |
| `baseline_lr.pr_auc` | 0.69655 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.70044 |
| `baseline_lr.brier` | 0.0028136 |
| `challenger_hgb.pr_auc` | 0.76295 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79295 |
| `challenger_hgb.brier` | 0.0014512 |

</details>
