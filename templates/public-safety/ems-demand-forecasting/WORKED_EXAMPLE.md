# Emergency Medical Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 1067, knobs {"n_series": 224}, in 22.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand.

**Constraints that shape the design.** Hourly forecast per zone for 14 days; Aggregated counts only; Interval output

**Label in this use case.** For "Emergency Medical Demand Forecasting": Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual-level prediction.

## 2. Choose the signals

Your strongest signal is **Same time last week calls** (calls in the same hour in past weeks). Its rule: Aligned. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.6% for the seasonal baseline, a forecast value added of 43.9%. At 14 days it is 14.8% against 23.2%. The upper band covers 89.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.6% |
| Forecast value added at 7 days | 43.9% |
| 90th-percentile band coverage | 89.4% |
| Error at SKU level versus aggregate | 12.5% vs 2.6% |

## 5. An edge case from the blueprint

**Heatwave.** demand moves outside history. Planned response: Heat features and wider intervals. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20298 |
| `h1.wmape_model` | 0.11762 |
| `h1.wmape_baseline` | 0.2279 |
| `h1.fva` | 0.48391 |
| `h3.wmape_model` | 0.11593 |
| `h3.wmape_baseline` | 0.22145 |
| `h3.fva` | 0.47648 |
| `h7.wmape_model` | 0.12102 |
| `h7.wmape_baseline` | 0.21554 |
| `h7.fva` | 0.43853 |
| `h14.wmape_model` | 0.14807 |
| `h14.wmape_baseline` | 0.232 |
| `h14.fva` | 0.36178 |
| `p90_coverage` | 0.89437 |
| `wmape_sku_level` | 0.12521 |
| `wmape_aggregate` | 0.025781 |
| `late_feed.missing_as_zero` | 0.18522 |
| `late_feed.missing_as_nan` | 0.13724 |

</details>
