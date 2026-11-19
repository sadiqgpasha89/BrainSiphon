# SIEM Alert Triage & Prioritisation: worked example

> Run on synthetic data with `tabular` engine, seed 45870, knobs {"n_entities": 2810, "positive_entity_rate": 0.024, "n_flash_sales": 6}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter.

**Constraints that shape the design.** Millions of alerts per day; Explainable priorities; Feedback loop from analysts

**Label in this use case.** For "SIEM Alert Triage & Prioritisation": Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Disposition labels biased by prior ordering.

## 2. Choose the signals

Your strongest signal is **Rule historical true-positive rate** (TP rate of the rule per asset class). Its rule: Matured labels. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.34% of the test period) and labels arrive weeks late. A model that always answers no would be 99.66% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.551 and finds 70.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.668 and 70.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.34% |
| Baseline PR-AUC | 0.551 |
| Baseline recall at 0.5% false positives | 70.0% |
| Challenger PR-AUC | 0.668 |
| Challenger recall at 0.5% false positives | 70.6% |

## 5. An edge case from the blueprint

**New detection rule has no history.** cold-start priority is wrong. Planned response: Prior from similar rules and exploration for new rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 214935 |
| `positive_rate` | 0.0028892 |
| `test_rows` | 72147 |
| `test_positive_rate` | 0.0034374 |
| `baseline_lr.pr_auc` | 0.55146 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.69966 |
| `baseline_lr.brier` | 0.0023085 |
| `challenger_hgb.pr_auc` | 0.66839 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.70565 |
| `challenger_hgb.brier` | 0.0016067 |

</details>
