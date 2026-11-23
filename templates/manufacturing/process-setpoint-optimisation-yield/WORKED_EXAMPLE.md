# Process Setpoint Optimisation for Yield: worked example

> Run on synthetic data with `tabular` engine, seed 37145, knobs {"n_entities": 2560, "positive_entity_rate": 0.03, "n_flash_sales": 4}, in 4.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits.

**Constraints that shape the design.** Recommendations bounded by validated safe limits; Operator or engineer approves each change; A model output cannot write directly to the controller

**Label in this use case.** For "Process Setpoint Optimisation for Yield": Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model learn safety limits.

## 2. Choose the signals

Your strongest signal is **Current setpoint distance from the optimum region** (position relative to the learned yield surface). Its rule: Constrained by limits. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.40% of the test period) and labels arrive weeks late. A model that always answers no would be 99.60% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.771 and finds 79.1% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.830 and 86.8%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.40% |
| Baseline PR-AUC | 0.771 |
| Baseline recall at 0.5% false positives | 79.1% |
| Challenger PR-AUC | 0.830 |
| Challenger recall at 0.5% false positives | 86.8% |

## 5. An edge case from the blueprint

**Unfamiliar feed.** the model extrapolates. Planned response: Uncertainty gating and fallback to standard setpoints. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 189976 |
| `positive_rate` | 0.0042374 |
| `test_rows` | 63912 |
| `test_positive_rate` | 0.0040368 |
| `baseline_lr.pr_auc` | 0.77135 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.7907 |
| `baseline_lr.brier` | 0.0018863 |
| `challenger_hgb.pr_auc` | 0.8298 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.86822 |
| `challenger_hgb.brier` | 0.0012736 |

</details>
