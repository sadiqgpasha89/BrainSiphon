# Wildfire Ignition Risk Forecasting: worked example

> Run on synthetic data with `tabular` engine, seed 49912, knobs {"n_entities": 2980, "positive_entity_rate": 0.04, "n_flash_sales": 5}, in 4.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings.

**Constraints that shape the design.** Segment risk for the next 72 hours with updates every 6 hours; Any power shutoff decision is made by named senior staff under the written protocol; Public safety above model output

**Label in this use case.** For "Wildfire Ignition Risk Forecasting": Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automated shutoff decisions.

## 2. Choose the signals

Your strongest signal is **Wind gust and direction forecast** (forecast wind speed and direction). Its rule: From weather models. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.59% of the test period) and labels arrive weeks late. A model that always answers no would be 99.41% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.408 and finds 63.8% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.770 and 78.0%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.59% |
| Baseline PR-AUC | 0.408 |
| Baseline recall at 0.5% false positives | 63.8% |
| Challenger PR-AUC | 0.770 |
| Challenger recall at 0.5% false positives | 78.0% |

## 5. An edge case from the blueprint

**Rapid weather shift.** the forecast changes in hours. Planned response: Frequent refresh and scenario views. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 228087 |
| `positive_rate` | 0.0053401 |
| `test_rows` | 76359 |
| `test_positive_rate` | 0.0059063 |
| `baseline_lr.pr_auc` | 0.40795 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.63778 |
| `baseline_lr.brier` | 0.010154 |
| `challenger_hgb.pr_auc` | 0.77038 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.78049 |
| `challenger_hgb.brier` | 0.0022611 |

</details>
