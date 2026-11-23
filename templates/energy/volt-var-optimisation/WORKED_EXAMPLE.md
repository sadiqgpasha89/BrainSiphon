# Volt-VAR Optimisation Advisor: worked example

> Run on synthetic data with `tabular` engine, seed 65517, knobs {"n_entities": 2490, "positive_entity_rate": 0.026, "n_flash_sales": 8}, in 3.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits.

**Constraints that shape the design.** Voltage limits enforced in a rules layer outside the model; Operator approves each settings change; Recommendation every 5 minutes

**Label in this use case.** For "Volt-VAR Optimisation Advisor": Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned safety limits.

## 2. Choose the signals

Your strongest signal is **Measured voltage profile** (voltages along the feeder). Its rule: From meters and sensors. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.33% of the test period) and labels arrive weeks late. A model that always answers no would be 99.67% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.709 and finds 84.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.814 and 84.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.33% |
| Baseline PR-AUC | 0.709 |
| Baseline recall at 0.5% false positives | 84.8% |
| Challenger PR-AUC | 0.814 |
| Challenger recall at 0.5% false positives | 84.8% |

## 5. An edge case from the blueprint

**Reverse power flow.** solar export raises voltage. Planned response: Inverter setting recommendations and limits. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 190676 |
| `positive_rate` | 0.0037603 |
| `test_rows` | 63474 |
| `test_positive_rate` | 0.0033242 |
| `baseline_lr.pr_auc` | 0.70927 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.84834 |
| `baseline_lr.brier` | 0.0086747 |
| `challenger_hgb.pr_auc` | 0.81406 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84834 |
| `challenger_hgb.brier` | 0.0010893 |

</details>
