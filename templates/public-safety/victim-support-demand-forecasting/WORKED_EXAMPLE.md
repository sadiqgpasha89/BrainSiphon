# Victim Support Service Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 66855, knobs {"n_series": 284}, in 17.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need.

**Constraints that shape the design.** Aggregated counts only; Weekly forecast for 26 weeks; No individual-level data

**Label in this use case.** For "Victim Support Service Demand Forecasting": Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Case-level modelling.

## 2. Choose the signals

Your strongest signal is **Past service contacts** (counts by service and week). Its rule: Aggregated. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 20.4% for the seasonal baseline, a forecast value added of 42.5%. At 14 days it is 14.6% against 21.7%. The upper band covers 89.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 20.4% |
| Forecast value added at 7 days | 42.5% |
| 90th-percentile band coverage | 89.4% |
| Error at SKU level versus aggregate | 12.4% vs 2.3% |

## 5. An edge case from the blueprint

**Reporting change.** providers change definitions. Planned response: Versioned definitions. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25822 |
| `h1.wmape_model` | 0.11784 |
| `h1.wmape_baseline` | 0.20513 |
| `h1.fva` | 0.42554 |
| `h3.wmape_model` | 0.11577 |
| `h3.wmape_baseline` | 0.20817 |
| `h3.fva` | 0.44385 |
| `h7.wmape_model` | 0.11709 |
| `h7.wmape_baseline` | 0.20381 |
| `h7.fva` | 0.42547 |
| `h14.wmape_model` | 0.14566 |
| `h14.wmape_baseline` | 0.21685 |
| `h14.fva` | 0.32828 |
| `p90_coverage` | 0.89439 |
| `wmape_sku_level` | 0.12371 |
| `wmape_aggregate` | 0.023395 |
| `late_feed.missing_as_zero` | 0.19425 |
| `late_feed.missing_as_nan` | 0.13752 |

</details>
