# Vendor Visit Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 74303, knobs {"n_series": 184}, in 16.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion.

**Constraints that shape the design.** Forecasts 20K facility-department-hour series nightly; Facility operations approve capacity and access windows; Outputs show peak periods and uncertainty

**Label in this use case.** For "Vendor Visit Demand Forecasting": Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using bookings as the target.

## 2. Choose the signals

Your strongest signal is **Booking pace** (bookings received by lead time versus the usual profile). Its rule: Snapshot at forecast time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.0% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.3% against 20.9% for the seasonal baseline, a forecast value added of 41.2%. At 14 days it is 14.9% against 23.2%. The upper band covers 87.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.3% |
| WAPE at 7 days, seasonal baseline | 20.9% |
| Forecast value added at 7 days | 41.2% |
| 90th-percentile band coverage | 87.8% |
| Error at SKU level versus aggregate | 12.7% vs 3.0% |

## 5. An edge case from the blueprint

**Facility closure.** zero visits for a period. Planned response: Calendar flags and a closure mask. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16755 |
| `h1.wmape_model` | 0.1189 |
| `h1.wmape_baseline` | 0.21201 |
| `h1.fva` | 0.43917 |
| `h3.wmape_model` | 0.11758 |
| `h3.wmape_baseline` | 0.22008 |
| `h3.fva` | 0.46573 |
| `h7.wmape_model` | 0.12303 |
| `h7.wmape_baseline` | 0.2094 |
| `h7.fva` | 0.41247 |
| `h14.wmape_model` | 0.14934 |
| `h14.wmape_baseline` | 0.23169 |
| `h14.fva` | 0.35541 |
| `p90_coverage` | 0.87789 |
| `wmape_sku_level` | 0.12668 |
| `wmape_aggregate` | 0.029734 |
| `late_feed.missing_as_zero` | 0.23295 |
| `late_feed.missing_as_nan` | 0.14056 |

</details>
