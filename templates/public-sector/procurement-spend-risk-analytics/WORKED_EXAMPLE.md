# Procurement Spend and Risk Analytics: worked example

> Run on synthetic data with `tabular` engine, seed 14218, knobs {"n_entities": 2520, "positive_entity_rate": 0.031, "n_flash_sales": 6}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score.

**Constraints that shape the design.** Indicators are leads for auditors; No accusation on a score; Evidence shown for each indicator

**Label in this use case.** For "Procurement Spend and Risk Analytics": Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Accusations from scores.

## 2. Choose the signals

Your strongest signal is **Single-bid and short-window tenders** (number of bids and tender period). Its rule: From tenders. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.40% of the test period) and labels arrive weeks late. A model that always answers no would be 99.60% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.701 and finds 74.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.741 and 77.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.40% |
| Baseline PR-AUC | 0.701 |
| Baseline recall at 0.5% false positives | 74.2% |
| Challenger PR-AUC | 0.741 |
| Challenger recall at 0.5% false positives | 77.7% |

## 5. An edge case from the blueprint

**Emergency procurement.** single bids are legitimate. Planned response: Emergency flags in features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 194197 |
| `positive_rate` | 0.003893 |
| `test_rows` | 65495 |
| `test_positive_rate` | 0.0039698 |
| `baseline_lr.pr_auc` | 0.70107 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.74231 |
| `baseline_lr.brier` | 0.0032895 |
| `challenger_hgb.pr_auc` | 0.7415 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.77692 |
| `challenger_hgb.brier` | 0.0016328 |

</details>
