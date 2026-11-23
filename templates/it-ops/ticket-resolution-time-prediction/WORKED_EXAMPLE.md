# Ticket Resolution Time Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 18669, knobs {"n_entities": 2910, "positive_entity_rate": 0.028, "n_flash_sales": 7}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents.

**Constraints that shape the design.** Estimates shown as ranges; Team-level queue views only; No individual agent ranking

**Label in this use case.** For "Ticket Resolution Time Prediction": Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Agent rankings.

## 2. Choose the signals

Your strongest signal is **Category and priority** (type and urgency). Its rule: From the ticket. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.24% of the test period) and labels arrive weeks late. A model that always answers no would be 99.76% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.245 and finds 33.0% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.590 and 74.4%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.24% |
| Baseline PR-AUC | 0.245 |
| Baseline recall at 0.5% false positives | 33.0% |
| Challenger PR-AUC | 0.590 |
| Challenger recall at 0.5% false positives | 74.4% |

## 5. An edge case from the blueprint

**Rare category.** few similar tickets exist. Planned response: Wider ranges and category pooling. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 220844 |
| `positive_rate` | 0.0034595 |
| `test_rows` | 74572 |
| `test_positive_rate` | 0.0023601 |
| `baseline_lr.pr_auc` | 0.24465 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.32955 |
| `baseline_lr.brier` | 0.0035032 |
| `challenger_hgb.pr_auc` | 0.59035 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.74432 |
| `challenger_hgb.brier` | 0.0014355 |

</details>
