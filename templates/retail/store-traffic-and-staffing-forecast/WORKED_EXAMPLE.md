# Store Traffic & Staffing Forecast: worked example

> Run on synthetic data with `forecast` engine, seed 8858, knobs {"n_series": 199}, in 6.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast footfall and transactions per store-hour to build schedules that match labour to demand.

**Constraints that shape the design.** Labour laws on scheduling notice; Break rules; Service-level targets

**Label in this use case.** For "Store Traffic & Staffing Forecast": Forecast footfall and transactions per store-hour to build schedules that match labour to demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using actual weather instead of forecast.

## 2. Choose the signals

Your strongest signal is **Hourly seasonality profile** (day-of-week by hour baseline). Its rule: Decay old seasons. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.9% on the aggregate but 12.3% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.3% against 22.4% for the seasonal baseline, a forecast value added of 45.1%. At 14 days it is 14.0% against 24.2%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.3% |
| WAPE at 7 days, seasonal baseline | 22.4% |
| Forecast value added at 7 days | 45.1% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.3% vs 2.9% |

## 5. An edge case from the blueprint

**Counter sensor outage.** hours of footfall are missing so the forecaster trains on gaps. Planned response: Imputation and sensor health flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18222 |
| `h1.wmape_model` | 0.11597 |
| `h1.wmape_baseline` | 0.22507 |
| `h1.fva` | 0.48471 |
| `h3.wmape_model` | 0.11395 |
| `h3.wmape_baseline` | 0.22395 |
| `h3.fva` | 0.4912 |
| `h7.wmape_model` | 0.12283 |
| `h7.wmape_baseline` | 0.2237 |
| `h7.fva` | 0.4509 |
| `h14.wmape_model` | 0.1404 |
| `h14.wmape_baseline` | 0.24243 |
| `h14.fva` | 0.42086 |
| `p90_coverage` | 0.89584 |
| `wmape_sku_level` | 0.1231 |
| `wmape_aggregate` | 0.029015 |
| `late_feed.missing_as_zero` | 0.19026 |
| `late_feed.missing_as_nan` | 0.14562 |

</details>
