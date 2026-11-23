# Hardware Failure Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 6403, knobs {"n_entities": 2280, "positive_entity_rate": 0.028, "n_flash_sales": 7}, in 3.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages.

**Constraints that shape the design.** Prediction lead time of at least 7 days; Replacements scheduled by owners; Data kept on devices protected during returns

**Label in this use case.** For "Hardware Failure Prediction": Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed-age replacement.

## 2. Choose the signals

Your strongest signal is **SMART and error counters** (disk reallocated sectors and errors). Its rule: From device telemetry. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.38% of the test period) and labels arrive weeks late. A model that always answers no would be 99.62% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.761 and finds 82.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.834 and 87.7%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.38% |
| Baseline PR-AUC | 0.761 |
| Baseline recall at 0.5% false positives | 82.3% |
| Challenger PR-AUC | 0.834 |
| Challenger recall at 0.5% false positives | 87.7% |

## 5. An edge case from the blueprint

**New hardware model.** there is no failure history. Planned response: Vendor priors and wide risk bands. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 175120 |
| `positive_rate` | 0.003923 |
| `test_rows` | 57576 |
| `test_positive_rate` | 0.003821 |
| `baseline_lr.pr_auc` | 0.76083 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82273 |
| `baseline_lr.brier` | 0.0018089 |
| `challenger_hgb.pr_auc` | 0.83361 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.87727 |
| `challenger_hgb.brier` | 0.0011842 |

</details>
