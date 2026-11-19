# Spaced Repetition Scheduling: worked example

> Run on synthetic data with `tabular` engine, seed 8682, knobs {"n_entities": 1890, "positive_entity_rate": 0.041, "n_flash_sales": 6}, in 1.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study.

**Constraints that shape the design.** Per-item memory state for millions of learners; Scheduling in 20 ms; Daily review caps

**Label in this use case.** For "Spaced Repetition Scheduling": Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting recall on items that scheduling selected.

## 2. Choose the signals

Your strongest signal is **Elapsed time since last review** (days since review). Its rule: Server time. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.63% of the test period) and labels arrive weeks late. A model that always answers no would be 99.37% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.690 and finds 72.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.791 and 79.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.63% |
| Baseline PR-AUC | 0.690 |
| Baseline recall at 0.5% false positives | 72.5% |
| Challenger PR-AUC | 0.791 |
| Challenger recall at 0.5% false positives | 79.0% |

## 5. An edge case from the blueprint

**Learner returns after months away.** backlog of thousands of due items. Planned response: Triage by retention loss and gradual re-entry plan. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 148175 |
| `positive_rate` | 0.0052775 |
| `test_rows` | 48813 |
| `test_positive_rate` | 0.0063303 |
| `baseline_lr.pr_auc` | 0.69042 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72492 |
| `baseline_lr.brier` | 0.0048113 |
| `challenger_hgb.pr_auc` | 0.79113 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78964 |
| `challenger_hgb.brier` | 0.0023181 |

</details>
