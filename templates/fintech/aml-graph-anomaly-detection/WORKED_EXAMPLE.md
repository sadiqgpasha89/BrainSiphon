# AML Graph Anomaly Detection: worked example

> Run on synthetic data with `tabular` engine, seed 13720, knobs {"n_entities": 2610, "positive_entity_rate": 0.037, "n_flash_sales": 4}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half.

**Constraints that shape the design.** SAR filing deadlines of 30 days; Alert explanations must be human-readable; Graph of 500M edges refreshed daily

**Label in this use case.** For "AML Graph Anomaly Detection": Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random edge split leaks future flows into training.

## 2. Choose the signals

Your strongest signal is **Pass-through ratio** (outflow within 24h divided by inflow). Its rule: Needs transaction timestamps not posting dates. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.57% of the test period) and labels arrive weeks late. A model that always answers no would be 99.43% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.794 and finds 83.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.847 and 86.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.57% |
| Baseline PR-AUC | 0.794 |
| Baseline recall at 0.5% false positives | 83.5% |
| Challenger PR-AUC | 0.847 |
| Challenger recall at 0.5% false positives | 86.9% |

## 5. An edge case from the blueprint

**Entity resolution splits one customer into two.** motif counts halve and ring evades detection. Planned response: Conservative merge thresholds and a household-level graph view. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 200474 |
| `positive_rate` | 0.0054271 |
| `test_rows` | 67133 |
| `test_positive_rate` | 0.0056753 |
| `baseline_lr.pr_auc` | 0.79388 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.83465 |
| `baseline_lr.brier` | 0.0020774 |
| `challenger_hgb.pr_auc` | 0.84723 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86877 |
| `challenger_hgb.brier` | 0.0016444 |

</details>
