# Genomic Variant Pathogenicity Classification: worked example

> Run on synthetic data with `tabular` engine, seed 45329, knobs {"n_entities": 2490, "positive_entity_rate": 0.026, "n_flash_sales": 4}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting.

**Constraints that shape the design.** Clinical-grade reproducibility; ACMG evidence mapping; Ancestry-aware allele frequencies

**Label in this use case.** For "Genomic Variant Pathogenicity Classification": Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Gene-level leakage between train and test.

## 2. Choose the signals

Your strongest signal is **Population allele frequency** (gnomAD frequency by ancestry). Its rule: Frequency database version. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.39% of the test period) and labels arrive weeks late. A model that always answers no would be 99.61% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.695 and finds 71.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.717 and 72.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.39% |
| Baseline PR-AUC | 0.695 |
| Baseline recall at 0.5% false positives | 71.7% |
| Challenger PR-AUC | 0.717 |
| Challenger recall at 0.5% false positives | 72.8% |

## 5. An edge case from the blueprint

**Database version update changes frequencies.** reclassification of reported variants. Planned response: Versioned annotations and reclassification alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 191313 |
| `positive_rate` | 0.0031258 |
| `test_rows` | 64480 |
| `test_positive_rate` | 0.0039392 |
| `baseline_lr.pr_auc` | 0.69503 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71654 |
| `baseline_lr.brier` | 0.0018267 |
| `challenger_hgb.pr_auc` | 0.71678 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.72835 |
| `challenger_hgb.brier` | 0.0017052 |

</details>
