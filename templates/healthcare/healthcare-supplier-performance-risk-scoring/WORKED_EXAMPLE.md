# Healthcare Supplier Performance & Risk Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 43199, knobs {"n_entities": 2430, "positive_entity_rate": 0.024, "n_flash_sales": 8}, in 12.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals.

**Constraints that shape the design.** Observed facts and external signals are shown separately; Supplier decisions need procurement and clinical value review; Scores show the evidence and the dimension

**Label in this use case.** For "Healthcare Supplier Performance & Risk Scoring": Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mixing facts with unverified external signals.

## 2. Choose the signals

Your strongest signal is **On-time-in-full rate trend** (trailing on-time-in-full against target and its slope). Its rule: Receipts as logged. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.748 and finds 81.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.740 and 80.2%; the baseline is ahead: the added complexity did not earn its place on this run.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.748 |
| Baseline recall at 0.5% false positives | 81.5% |
| Challenger PR-AUC | 0.740 |
| Challenger recall at 0.5% false positives | 80.2% |

## 5. An edge case from the blueprint

**Supplier merger.** history is split. Planned response: Supplier hierarchy with lineage. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 188847 |
| `positive_rate` | 0.0033519 |
| `test_rows` | 63802 |
| `test_positive_rate` | 0.0034795 |
| `baseline_lr.pr_auc` | 0.7477 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81532 |
| `baseline_lr.brier` | 0.0015058 |
| `challenger_hgb.pr_auc` | 0.73998 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.8018 |
| `challenger_hgb.brier` | 0.0015261 |

</details>
