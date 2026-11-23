# Per-Customer Network Experience Scoring: worked example

> Run on synthetic data with `tabular` engine, seed 87761, knobs {"n_entities": 1830, "positive_entity_rate": 0.04, "n_flash_sales": 5}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy.

**Constraints that shape the design.** Score based on aggregated session KPIs not content; Customers with too few sessions get no score not a guess; Score tracks survey satisfaction

**Label in this use case.** For "Per-Customer Network Experience Scoring": Compute a daily experience score per customer from the sessions they actually had, so operations and care see who is truly affected rather than which cells are busy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Averaging KPIs by cell.

## 2. Choose the signals

Your strongest signal is **Session success rate** (share of sessions that completed). Its rule: Define per service type. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.58% of the test period) and labels arrive weeks late. A model that always answers no would be 99.42% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.801 and finds 81.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.841 and 84.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.58% |
| Baseline PR-AUC | 0.801 |
| Baseline recall at 0.5% false positives | 81.9% |
| Challenger PR-AUC | 0.841 |
| Challenger recall at 0.5% false positives | 84.5% |

## 5. An edge case from the blueprint

**Heavy traveller.** sessions in many cells. Planned response: Aggregate by experience not by cell. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 142214 |
| `positive_rate` | 0.0058222 |
| `test_rows` | 47022 |
| `test_positive_rate` | 0.0057633 |
| `baseline_lr.pr_auc` | 0.8013 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.81919 |
| `baseline_lr.brier` | 0.0019774 |
| `challenger_hgb.pr_auc` | 0.84104 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84502 |
| `challenger_hgb.brier` | 0.0017391 |

</details>
