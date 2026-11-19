# Chargeback Dispute Prediction & Evidence Automation: worked example

> Run on synthetic data with `tabular` engine, seed 57794, knobs {"n_entities": 2930, "positive_entity_rate": 0.041, "n_flash_sales": 5}, in 3.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost.

**Constraints that shape the design.** Network-specific evidence deadlines; Merchant data residency; Win-rate versus cost ceilings

**Label in this use case.** For "Chargeback Dispute Prediction & Evidence Automation": Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on disputes the team chose to contest.

## 2. Choose the signals

Your strongest signal is **Evidence completeness score** (fraction of required evidence fields present for the reason code). Its rule: Compute at submission time only. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.48% of the test period) and labels arrive weeks late. A model that always answers no would be 99.52% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.747 and finds 77.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.769 and 78.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.48% |
| Baseline PR-AUC | 0.747 |
| Baseline recall at 0.5% false positives | 77.8% |
| Challenger PR-AUC | 0.769 |
| Challenger recall at 0.5% false positives | 78.1% |

## 5. An edge case from the blueprint

**Network deadline in 7 days.** late evidence rejected. Planned response: Deadline-aware prioritisation queue. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 222138 |
| `positive_rate` | 0.0055011 |
| `test_rows` | 74941 |
| `test_positive_rate` | 0.0047504 |
| `baseline_lr.pr_auc` | 0.7473 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.77809 |
| `baseline_lr.brier` | 0.0019787 |
| `challenger_hgb.pr_auc` | 0.76929 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7809 |
| `challenger_hgb.brier` | 0.0018031 |

</details>
