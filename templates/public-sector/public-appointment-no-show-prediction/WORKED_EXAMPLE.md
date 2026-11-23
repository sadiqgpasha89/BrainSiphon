# Public Service Appointment No-Show Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 54556, knobs {"n_entities": 2220, "positive_entity_rate": 0.021, "n_flash_sales": 5}, in 3.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone.

**Constraints that shape the design.** Used for reminders and overbooking limits only; No penalties or service denial; Reminders in the person's language and channel

**Label in this use case.** For "Public Service Appointment No-Show Prediction": Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Penalising predicted no-shows.

## 2. Choose the signals

Your strongest signal is **Lead time** (days between booking and the appointment). Its rule: From booking. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.30% of the test period) and labels arrive weeks late. A model that always answers no would be 99.70% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.768 and finds 80.7% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.803 and 82.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.30% |
| Baseline PR-AUC | 0.768 |
| Baseline recall at 0.5% false positives | 80.7% |
| Challenger PR-AUC | 0.803 |
| Challenger recall at 0.5% false positives | 82.5% |

## 5. An edge case from the blueprint

**Public transport strike.** many miss at once. Planned response: Event flags and rebooking drives. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 171163 |
| `positive_rate` | 0.0028686 |
| `test_rows` | 56593 |
| `test_positive_rate` | 0.0030216 |
| `baseline_lr.pr_auc` | 0.76848 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80702 |
| `baseline_lr.brier` | 0.0011523 |
| `challenger_hgb.pr_auc` | 0.80324 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.82456 |
| `challenger_hgb.brier` | 0.0010348 |

</details>
