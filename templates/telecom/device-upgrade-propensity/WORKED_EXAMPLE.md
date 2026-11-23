# Device Upgrade Propensity: worked example

> Run on synthetic data with `tabular` engine, seed 64808, knobs {"n_entities": 1880, "positive_entity_rate": 0.031, "n_flash_sales": 7}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly.

**Constraints that shape the design.** Use only consented marketing data; Predictions per device model for stock planning; Refreshed weekly for 20M customers

**Label in this use case.** For "Device Upgrade Propensity": Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting visits as upgrades.

## 2. Choose the signals

Your strongest signal is **Device age** (months since the device was acquired). Its rule: From the device record. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.35% of the test period) and labels arrive weeks late. A model that always answers no would be 99.65% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.726 and finds 80.3% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.743 and 83.1%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.35% |
| Baseline PR-AUC | 0.726 |
| Baseline recall at 0.5% false positives | 80.3% |
| Challenger PR-AUC | 0.743 |
| Challenger recall at 0.5% false positives | 83.1% |

## 5. An edge case from the blueprint

**New device launch.** the new device has no upgrade history. Planned response: Use similar devices as priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 148958 |
| `positive_rate` | 0.0037393 |
| `test_rows` | 50650 |
| `test_positive_rate` | 0.0034946 |
| `baseline_lr.pr_auc` | 0.72641 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.8026 |
| `baseline_lr.brier` | 0.0016951 |
| `challenger_hgb.pr_auc` | 0.74314 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83051 |
| `challenger_hgb.brier` | 0.0015566 |

</details>
