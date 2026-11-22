# Healthcare Contract Portfolio Risk Prioritization: worked example

> Run on synthetic data with `tabular` engine, seed 89739, knobs {"n_entities": 2980, "positive_entity_rate": 0.037, "n_flash_sales": 8}, in 14.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most.

**Constraints that shape the design.** Risk owners set weights and approve escalations; Scores are explainable by dimension with evidence; Graph relationships show shared-supplier and dependency exposure

**Label in this use case.** For "Healthcare Contract Portfolio Risk Prioritization": Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Hiding weights from owners.

## 2. Choose the signals

Your strongest signal is **Dimension exposure scores** (normalised exposure for each risk dimension from verified inputs). Its rule: Input snapshots. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.51% of the test period) and labels arrive weeks late. A model that always answers no would be 99.49% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.726 and finds 79.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.840 and 85.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.51% |
| Baseline PR-AUC | 0.726 |
| Baseline recall at 0.5% false positives | 79.1% |
| Challenger PR-AUC | 0.840 |
| Challenger recall at 0.5% false positives | 85.1% |

## 5. An edge case from the blueprint

**Missing data for a dimension.** the score is understated. Planned response: Show missing data and a lower-confidence label. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 228284 |
| `positive_rate` | 0.0052785 |
| `test_rows` | 74875 |
| `test_positive_rate` | 0.0051018 |
| `baseline_lr.pr_auc` | 0.72567 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.79058 |
| `baseline_lr.brier` | 0.0021637 |
| `challenger_hgb.pr_auc` | 0.84027 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.85079 |
| `challenger_hgb.brier` | 0.0015305 |

</details>
