# Injection Moulding Parameter Tuning: worked example

> Run on synthetic data with `tabular` engine, seed 30380, knobs {"n_entities": 2980, "positive_entity_rate": 0.03, "n_flash_sales": 4}, in 4.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap.

**Constraints that shape the design.** Suggested changes within validated ranges; The setter approves each change; Part quality checks after every change

**Label in this use case.** For "Injection Moulding Parameter Tuning": Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Free exploration in production.

## 2. Choose the signals

Your strongest signal is **Cavity pressure curve features** (peak and integral of the cavity pressure curve). Its rule: Per tool. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.54% of the test period) and labels arrive weeks late. A model that always answers no would be 99.46% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.783 and finds 80.6% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.810 and 84.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.54% |
| Baseline PR-AUC | 0.783 |
| Baseline recall at 0.5% false positives | 80.6% |
| Challenger PR-AUC | 0.810 |
| Challenger recall at 0.5% false positives | 84.0% |

## 5. An edge case from the blueprint

**Tool wear.** optimal parameters shift slowly. Planned response: Tool-life features and a maintenance trigger. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 225460 |
| `positive_rate` | 0.0041471 |
| `test_rows` | 75687 |
| `test_positive_rate` | 0.0054435 |
| `baseline_lr.pr_auc` | 0.78273 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.80588 |
| `baseline_lr.brier` | 0.0019635 |
| `challenger_hgb.pr_auc` | 0.80962 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83981 |
| `challenger_hgb.brier` | 0.0019312 |

</details>
