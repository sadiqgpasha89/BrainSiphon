# Utility Plant Setpoint Optimisation: worked example

> Run on synthetic data with `tabular` engine, seed 44853, knobs {"n_entities": 2190, "positive_entity_rate": 0.028, "n_flash_sales": 6}, in 3.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits.

**Constraints that shape the design.** Limits on temperatures and pressures enforced in code; Operator approves any setpoint change; Simulation test before live use

**Label in this use case.** For "Utility Plant Setpoint Optimisation": Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned safety limits.

## 2. Choose the signals

Your strongest signal is **Equipment efficiency curve** (measured efficiency against load). Its rule: Fit per equipment. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.42% of the test period) and labels arrive weeks late. A model that always answers no would be 99.58% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.768 and finds 82.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.789 and 84.5%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.42% |
| Baseline PR-AUC | 0.768 |
| Baseline recall at 0.5% false positives | 82.8% |
| Challenger PR-AUC | 0.789 |
| Challenger recall at 0.5% false positives | 84.5% |

## 5. An edge case from the blueprint

**Equipment failure.** a chiller trips. Planned response: Fast re-optimisation with the remaining units. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 165896 |
| `positive_rate` | 0.0038036 |
| `test_rows` | 55448 |
| `test_positive_rate` | 0.0041841 |
| `baseline_lr.pr_auc` | 0.76792 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82759 |
| `baseline_lr.brier` | 0.0017301 |
| `challenger_hgb.pr_auc` | 0.78915 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.84483 |
| `challenger_hgb.brier` | 0.0015171 |

</details>
