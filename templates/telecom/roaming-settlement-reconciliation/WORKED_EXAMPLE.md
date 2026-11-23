# Roaming Settlement Reconciliation: worked example

> Run on synthetic data with `tabular` engine, seed 31649, knobs {"n_entities": 2920, "positive_entity_rate": 0.04, "n_flash_sales": 7}, in 4.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate.

**Constraints that shape the design.** Matching on record keys and tolerances agreed in partner contracts; Disputes backed by records; Currency and tax rules applied correctly

**Label in this use case.** For "Roaming Settlement Reconciliation": Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fuzzy matching without contract rules.

## 2. Choose the signals

Your strongest signal is **Unmatched record share** (share of records without a partner match by partner). Its rule: Per period. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.55% of the test period) and labels arrive weeks late. A model that always answers no would be 99.45% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.626 and finds 71.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.790 and 78.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.55% |
| Baseline PR-AUC | 0.626 |
| Baseline recall at 0.5% false positives | 71.7% |
| Challenger PR-AUC | 0.790 |
| Challenger recall at 0.5% false positives | 78.9% |

## 5. An edge case from the blueprint

**Currency conversion differences.** totals differ by rate source. Planned response: Use contract rates and record the source. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 218884 |
| `positive_rate` | 0.0052813 |
| `test_rows` | 73878 |
| `test_positive_rate` | 0.0055091 |
| `baseline_lr.pr_auc` | 0.62627 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.71747 |
| `baseline_lr.brier` | 0.0051312 |
| `challenger_hgb.pr_auc` | 0.79013 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7887 |
| `challenger_hgb.brier` | 0.0019877 |

</details>
