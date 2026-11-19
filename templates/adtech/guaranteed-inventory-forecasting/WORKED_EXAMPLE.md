# Guaranteed Inventory & Delivery Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 41809, knobs {"n_series": 288}, in 7.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery.

**Constraints that shape the design.** Overbooking penalties; Audience overlap; Seasonality

**Label in this use case.** For "Guaranteed Inventory & Delivery Forecasting": Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ignoring overlap between audiences.

## 2. Choose the signals

Your strongest signal is **Historical impressions by placement** (daily counts). Its rule: Cleaning. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 20.6% for the seasonal baseline, a forecast value added of 41.9%. At 14 days it is 14.9% against 22.1%. The upper band covers 90.0% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 20.6% |
| Forecast value added at 7 days | 41.9% |
| 90th-percentile band coverage | 90.0% |
| Error at SKU level versus aggregate | 12.6% vs 2.3% |

## 5. An edge case from the blueprint

**Publisher traffic change after redesign.** forecasts stale. Planned response: Change-point detection and publisher alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 26152 |
| `h1.wmape_model` | 0.11745 |
| `h1.wmape_baseline` | 0.21497 |
| `h1.fva` | 0.45362 |
| `h3.wmape_model` | 0.12101 |
| `h3.wmape_baseline` | 0.23717 |
| `h3.fva` | 0.48979 |
| `h7.wmape_model` | 0.1199 |
| `h7.wmape_baseline` | 0.20631 |
| `h7.fva` | 0.41883 |
| `h14.wmape_model` | 0.14901 |
| `h14.wmape_baseline` | 0.22096 |
| `h14.fva` | 0.32565 |
| `p90_coverage` | 0.90039 |
| `wmape_sku_level` | 0.12616 |
| `wmape_aggregate` | 0.022554 |
| `late_feed.missing_as_zero` | 0.1957 |
| `late_feed.missing_as_nan` | 0.14056 |

</details>
