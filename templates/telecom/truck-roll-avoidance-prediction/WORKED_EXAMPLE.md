# Truck-Roll Avoidance Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 52903, knobs {"n_entities": 2680, "positive_entity_rate": 0.043, "n_flash_sales": 7}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest.

**Constraints that shape the design.** Never delay a visit for a safety or service-critical fault; Remote steps limited to approved actions; Customer can request a visit

**Label in this use case.** For "Truck-Roll Avoidance Prediction": Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Delaying critical visits.

## 2. Choose the signals

Your strongest signal is **Line and modem diagnostics** (line quality, sync and reboot history). Its rule: From the line test. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.47% of the test period) and labels arrive weeks late. A model that always answers no would be 99.53% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.754 and finds 80.9% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.820 and 83.6%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.47% |
| Baseline PR-AUC | 0.754 |
| Baseline recall at 0.5% false positives | 80.9% |
| Challenger PR-AUC | 0.820 |
| Challenger recall at 0.5% false positives | 83.6% |

## 5. An edge case from the blueprint

**Intermittent fault.** tests pass while the fault remains. Planned response: Repeat tests and flag intermittent patterns. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 206471 |
| `positive_rate` | 0.0058071 |
| `test_rows` | 68683 |
| `test_positive_rate` | 0.0047173 |
| `baseline_lr.pr_auc` | 0.75445 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80864 |
| `baseline_lr.brier` | 0.0021699 |
| `challenger_hgb.pr_auc` | 0.81977 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83642 |
| `challenger_hgb.brier` | 0.0015448 |

</details>
