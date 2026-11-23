# RAN Energy Saving & Cell Sleep Optimisation: worked example

> Run on synthetic data with `tabular` engine, seed 76764, knobs {"n_entities": 2850, "positive_entity_rate": 0.025, "n_flash_sales": 4}, in 4.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience.

**Constraints that shape the design.** Quality guardrails on throughput, accessibility and drop rate; Coverage cells never sleep and emergency services stay reachable; Every state change reversible within seconds

**Label in this use case.** For "RAN Energy Saving & Cell Sleep Optimisation": Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting before and after savings.

## 2. Choose the signals

Your strongest signal is **Predicted load next hour** (forecast of users and traffic for the cell). Its rule: Forecast uncertainty must be used. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.57% of the test period) and labels arrive weeks late. A model that always answers no would be 99.43% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.745 and finds 78.5% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.778 and 79.3%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.57% |
| Baseline PR-AUC | 0.745 |
| Baseline recall at 0.5% false positives | 78.5% |
| Challenger PR-AUC | 0.778 |
| Challenger recall at 0.5% false positives | 79.3% |

## 5. An edge case from the blueprint

**Unexpected event.** crowd arrives at a sleeping cell. Planned response: Fast wake-up trigger on load and a conservative forecast quantile. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 217410 |
| `positive_rate` | 0.0036659 |
| `test_rows` | 72294 |
| `test_positive_rate` | 0.0056713 |
| `baseline_lr.pr_auc` | 0.74543 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.78537 |
| `baseline_lr.brier` | 0.0024988 |
| `challenger_hgb.pr_auc` | 0.7781 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.79268 |
| `challenger_hgb.brier` | 0.0024041 |

</details>
