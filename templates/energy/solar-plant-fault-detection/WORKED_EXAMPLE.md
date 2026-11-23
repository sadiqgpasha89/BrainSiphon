# Solar Plant Fault Detection: worked example

> Run on synthetic data with `tabular` engine, seed 20710, knobs {"n_entities": 1800, "positive_entity_rate": 0.045, "n_flash_sales": 6}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs.

**Constraints that shape the design.** Loss estimate in kWh per fault; Cleaning and electrical faults separated; Technician confirms before parts are ordered

**Label in this use case.** For "Solar Plant Fault Detection": Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Nameplate baselines.

## 2. Choose the signals

Your strongest signal is **Power ratio against model** (measured over expected power). Its rule: By string. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.62% of the test period) and labels arrive weeks late. A model that always answers no would be 99.38% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.737 and finds 73.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.776 and 81.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.62% |
| Baseline PR-AUC | 0.737 |
| Baseline recall at 0.5% false positives | 73.8% |
| Challenger PR-AUC | 0.776 |
| Challenger recall at 0.5% false positives | 81.6% |

## 5. An edge case from the blueprint

**Curtailment.** output is limited by the grid. Planned response: Curtailment flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 140395 |
| `positive_rate` | 0.0055771 |
| `test_rows` | 47214 |
| `test_positive_rate` | 0.006227 |
| `baseline_lr.pr_auc` | 0.73704 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7381 |
| `baseline_lr.brier` | 0.0028979 |
| `challenger_hgb.pr_auc` | 0.77582 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.81633 |
| `challenger_hgb.brier` | 0.0024976 |

</details>
