# Device Health Prediction: worked example

> Run on synthetic data with `tabular` engine, seed 13478, knobs {"n_entities": 2540, "positive_entity_rate": 0.03, "n_flash_sales": 5}, in 3.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only.

**Constraints that shape the design.** Device-level telemetry only with no content or browsing; Employee notified before any action; Calibrated risk scores

**Label in this use case.** For "Device Health Prediction": Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Content monitoring.

## 2. Choose the signals

Your strongest signal is **Battery and disk health** (capacity and error counters). Its rule: From device agents. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.37% of the test period) and labels arrive weeks late. A model that always answers no would be 99.63% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.608 and finds 75.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.752 and 78.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.37% |
| Baseline PR-AUC | 0.608 |
| Baseline recall at 0.5% false positives | 75.1% |
| Challenger PR-AUC | 0.752 |
| Challenger recall at 0.5% false positives | 78.8% |

## 5. An edge case from the blueprint

**New model.** there is no history. Planned response: Vendor priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 195253 |
| `positive_rate` | 0.003877 |
| `test_rows` | 65397 |
| `test_positive_rate` | 0.0036699 |
| `baseline_lr.pr_auc` | 0.60789 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.75074 |
| `baseline_lr.brier` | 0.0028498 |
| `challenger_hgb.pr_auc` | 0.75156 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.7875 |
| `challenger_hgb.brier` | 0.0014787 |

</details>
