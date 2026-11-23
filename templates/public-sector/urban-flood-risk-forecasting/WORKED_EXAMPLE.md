# Urban Flood Risk Forecasting: worked example

> Run on synthetic data with `tabular` engine, seed 83691, knobs {"n_entities": 2020, "positive_entity_rate": 0.037, "n_flash_sales": 4}, in 3.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time.

**Constraints that shape the design.** Risk maps for the next 6 hours updated every 15 minutes; Warnings issued by named duty officers; Intervals and scenario ranges shown

**Label in this use case.** For "Urban Flood Risk Forecasting": Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rainfall thresholds only.

## 2. Choose the signals

Your strongest signal is **Rainfall nowcast and forecast** (radar and model rainfall). Its rule: From weather services. In the starter, the closest executable idea is **short-window activity**: count and sum of the entity's events in the last minute, hour and day, closed strictly before the decision time. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Positives are rare (0.69% of the test period) and labels arrive weeks late. A model that always answers no would be 99.31% accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.

## 4. Baseline against the stronger design

The calibrated logistic baseline reaches PR-AUC 0.783 and finds 82.2% of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC 0.822 and 83.9%; the challenger is ahead.

| Result | Value |
|---|---|
| Test-period positive rate | 0.69% |
| Baseline PR-AUC | 0.783 |
| Baseline recall at 0.5% false positives | 82.2% |
| Challenger PR-AUC | 0.822 |
| Challenger recall at 0.5% false positives | 83.9% |

## 5. An edge case from the blueprint

**Blocked drain.** capacity is lower than modelled. Planned response: Telemetry and a complaint-based update. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 152555 |
| `positive_rate` | 0.0051522 |
| `test_rows` | 51513 |
| `test_positive_rate` | 0.0068915 |
| `baseline_lr.pr_auc` | 0.78276 |
| `baseline_lr.recall_at_0.5pct_fpr` | 0.82239 |
| `baseline_lr.brier` | 0.0026094 |
| `challenger_hgb.pr_auc` | 0.82158 |
| `challenger_hgb.recall_at_0.5pct_fpr` | 0.83944 |
| `challenger_hgb.brier` | 0.0025134 |

</details>
