# Revenue & Pipeline Forecasting: worked example

> Run on synthetic data with `tabular` engine, seed 2671, knobs {"n_entities": 2680, "positive_entity_rate": 0.026, "n_flash_sales": 6}, in 3.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning.

**Constraints that shape the design.** Sparse deals relative to rows; Rep optimism bias; Reproducible commits

**Label in this use case.** For "Revenue & Pipeline Forecasting": Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using stage at close in features.

## 2. Choose the signals

Your strongest signal is **Deal stage age vs norm** (days in stage over median). Its rule: CRM history. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.41% of the test period) and labels arrive weeks late. A model that always answers no would be 99.59% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.776 and finds 80.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.807 and 84.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.41% |
| Baseline PR-AUC | 0.776 |
| Baseline recall at 0.5% false positives | 80.1% |
| Challenger PR-AUC | 0.807 |
| Challenger recall at 0.5% false positives | 84.3% |

## 5. An edge case from the blueprint

**CRM hygiene lapses.** stale stages mislead models. Planned response: Stage-hygiene features and data-quality alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 203872 |
| `positive_rate` | 0.0038308 |
| `test_rows` | 67970 |
| `test_positive_rate` | 0.0041195 |
| `baseline_lr.pr_auc` | 0.77622 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80109 |
| `baseline_lr.brier` | 0.0015441 |
| `challenger_hgb.pr_auc` | 0.80654 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84286 |
| `challenger_hgb.brier` | 0.0013645 |

</details>
