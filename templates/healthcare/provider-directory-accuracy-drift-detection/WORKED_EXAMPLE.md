# Provider Directory Accuracy & Drift Detection: worked example

> Run on synthetic data with `tabular` engine, seed 16692, knobs {"n_entities": 2310, "positive_entity_rate": 0.022, "n_flash_sales": 4}, in 11.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue.

**Constraints that shape the design.** A data steward or the provider confirms a correction before publication and the tool never edits the live directory; Authoritative sources outrank inferred signals and every flag shows its source and age; Claims and encounter signals are used only where lawful and only in aggregate for the flag

**Label in this use case.** For "Provider Directory Accuracy & Drift Detection": Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting inferred signals override authoritative sources.

## 2. Choose the signals

Your strongest signal is **Source disagreement** (difference between the directory value and an authoritative or attested value). Its rule: Source snapshots. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.30% of the test period) and labels arrive weeks late. A model that always answers no would be 99.70% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.708 and finds 83.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.771 and 80.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.30% |
| Baseline PR-AUC | 0.708 |
| Baseline recall at 0.5% false positives | 83.1% |
| Challenger PR-AUC | 0.771 |
| Challenger recall at 0.5% false positives | 80.8% |

## 5. An edge case from the blueprint

**Provider with several locations.** one location changes. Planned response: Location-level records. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 175474 |
| `positive_rate` | 0.0029463 |
| `test_rows` | 59445 |
| `test_positive_rate` | 0.0029775 |
| `baseline_lr.pr_auc` | 0.70777 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.83051 |
| `baseline_lr.brier` | 0.0016311 |
| `challenger_hgb.pr_auc` | 0.77077 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.80791 |
| `challenger_hgb.brier` | 0.0010205 |

</details>
