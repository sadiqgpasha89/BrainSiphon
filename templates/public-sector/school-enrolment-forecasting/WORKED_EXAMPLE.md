# School Enrolment Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 80715, knobs {"n_series": 217}, in 22.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time.

**Constraints that shape the design.** Forecast for 10 years with intervals; Aggregated data by catchment; Housing development pipeline as input

**Label in this use case.** For "School Enrolment Forecasting": Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Trend-only forecasts.

## 2. Choose the signals

Your strongest signal is **Births by area** (births five years earlier). Its rule: From registers. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 20.7% for the seasonal baseline, a forecast value added of 41.2%. At 14 days it is 14.7% against 22.1%. The upper band covers 88.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 20.7% |
| Forecast value added at 7 days | 41.2% |
| 90th-percentile band coverage | 88.9% |
| Error at SKU level versus aggregate | 12.5% vs 2.2% |

## 5. An edge case from the blueprint

**New housing delayed.** the pipeline slips. Planned response: Scenario updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19707 |
| `h1.wmape_model` | 0.11428 |
| `h1.wmape_baseline` | 0.20453 |
| `h1.fva` | 0.44125 |
| `h3.wmape_model` | 0.11919 |
| `h3.wmape_baseline` | 0.21965 |
| `h3.fva` | 0.45733 |
| `h7.wmape_model` | 0.12145 |
| `h7.wmape_baseline` | 0.20657 |
| `h7.fva` | 0.41208 |
| `h14.wmape_model` | 0.14677 |
| `h14.wmape_baseline` | 0.22106 |
| `h14.fva` | 0.33603 |
| `p90_coverage` | 0.88852 |
| `wmape_sku_level` | 0.12496 |
| `wmape_aggregate` | 0.021702 |
| `late_feed.missing_as_zero` | 0.19406 |
| `late_feed.missing_as_nan` | 0.14011 |

</details>
