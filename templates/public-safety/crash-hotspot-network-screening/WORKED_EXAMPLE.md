# Crash Hotspot Network Screening: worked example

> Run on synthetic data with `tabular` engine, seed 90413, knobs {"n_entities": 2980, "positive_entity_rate": 0.028, "n_flash_sales": 4}, in 4.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential.

**Constraints that shape the design.** Empirical Bayes adjustment for random variation; Severity-weighted ranking; Engineers review each site

**Label in this use case.** For "Crash Hotspot Network Screening": Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw crash counts.

## 2. Choose the signals

Your strongest signal is **Crash history by severity** (observed crashes over years). Its rule: From crash records. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.33% of the test period) and labels arrive weeks late. A model that always answers no would be 99.67% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.557 and finds 62.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.655 and 72.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.33% |
| Baseline PR-AUC | 0.557 |
| Baseline recall at 0.5% false positives | 62.9% |
| Challenger PR-AUC | 0.655 |
| Challenger recall at 0.5% false positives | 72.6% |

## 5. An edge case from the blueprint

**Underreporting.** minor crashes are missed. Planned response: Severity-focused ranking. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 231222 |
| `positive_rate` | 0.003408 |
| `test_rows` | 76318 |
| `test_positive_rate` | 0.003302 |
| `baseline_lr.pr_auc` | 0.5567 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.6293 |
| `baseline_lr.brier` | 0.0022374 |
| `challenger_hgb.pr_auc` | 0.65471 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.72619 |
| `challenger_hgb.brier` | 0.0016558 |

</details>
