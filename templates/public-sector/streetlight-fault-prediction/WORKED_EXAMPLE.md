# Streetlight Fault Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 75343, knobs {"n_entities": 2350, "positive_entity_rate": 0.024, "n_flash_sales": 5}, in 3.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark.

**Constraints that shape the design.** Failure probability within 30 days; Priority to high-risk streets and crossings; Repair routes optimised

**Label in this use case.** For "Streetlight Fault Prediction": Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Complaint-led repairs.

## 2. Choose the signals

Your strongest signal is **Power draw drift** (change in power consumption). Its rule: From controllers. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.36% of the test period) and labels arrive weeks late. A model that always answers no would be 99.64% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.675 and finds 72.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.676 and 71.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.36% |
| Baseline PR-AUC | 0.675 |
| Baseline recall at 0.5% false positives | 72.6% |
| Challenger PR-AUC | 0.676 |
| Challenger recall at 0.5% false positives | 71.9% |

## 5. An edge case from the blueprint

**Controller outage.** many lights report no data. Planned response: Outage flags to avoid false failures. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 178303 |
| `positive_rate` | 0.003438 |
| `test_rows` | 60857 |
| `test_positive_rate` | 0.0035657 |
| `baseline_lr.pr_auc` | 0.67529 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.72598 |
| `baseline_lr.brier` | 0.0016543 |
| `challenger_hgb.pr_auc` | 0.67572 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.71889 |
| `challenger_hgb.brier` | 0.0017759 |

</details>
