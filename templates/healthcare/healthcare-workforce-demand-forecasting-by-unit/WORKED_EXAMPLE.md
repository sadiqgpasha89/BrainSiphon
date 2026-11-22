# Healthcare Workforce Demand Forecasting by Unit: worked example

> Run on synthetic data with `forecast` engine, seed 12222, knobs {"n_series": 201}, in 38.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start.

**Constraints that shape the design.** Forecasts 40K unit-shift-role series nightly at hourly, shift, day and week horizons; Facility totals must reconcile to the sum of unit forecasts; Workload demand is kept separate from the legally or policy-required minimum coverage

**Label in this use case.** For "Healthcare Workforce Demand Forecasting by Unit": Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on paid hours that reflect past shortages.

## 2. Choose the signals

Your strongest signal is **Acuity-weighted workload** (sum of acuity scores times expected hours of care per patient-day). Its rule: Use the acuity score as charted at forecast time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 22.1% for the seasonal baseline, a forecast value added of 45.3%. At 14 days it is 14.8% against 23.3%. The upper band covers 89.2% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 22.1% |
| Forecast value added at 7 days | 45.3% |
| 90th-percentile band coverage | 89.2% |
| Error at SKU level versus aggregate | 12.7% vs 2.5% |

## 5. An edge case from the blueprint

**New unit opens or closes.** no history for the new series and a stale series for the closed one. Planned response: Cold-start from a peer-unit profile and automatic retirement of series with no patients for 28 days. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Real series have promotions, stock-outs and late feeds this generator only approximates. Keep the rolling-origin backtest, the origin-safe features and the band-coverage check.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 18269 |
| `h1.wmape_model` | 0.12086 |
| `h1.wmape_baseline` | 0.22455 |
| `h1.fva` | 0.46177 |
| `h3.wmape_model` | 0.12209 |
| `h3.wmape_baseline` | 0.21859 |
| `h3.fva` | 0.44145 |
| `h7.wmape_model` | 0.12106 |
| `h7.wmape_baseline` | 0.22131 |
| `h7.fva` | 0.453 |
| `h14.wmape_model` | 0.14785 |
| `h14.wmape_baseline` | 0.23296 |
| `h14.fva` | 0.36536 |
| `p90_coverage` | 0.89151 |
| `wmape_sku_level` | 0.12743 |
| `wmape_aggregate` | 0.025451 |
| `late_feed.missing_as_zero` | 0.18436 |
| `late_feed.missing_as_nan` | 0.14299 |

</details>
