# Day-Ahead Price Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 88734, knobs {"n_series": 192}, in 18.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty.

**Constraints that shape the design.** Hourly forecast for the next day; Prediction intervals and spike probabilities; Forecast published before the bid deadline

**Label in this use case.** For "Day-Ahead Price Forecasting": Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mean-only forecasts.

## 2. Choose the signals

Your strongest signal is **Residual load forecast** (demand minus wind and solar). Its rule: From the forecasts. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.4% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 22.8% for the seasonal baseline, a forecast value added of 47.6%. At 14 days it is 14.7% against 24.5%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 22.8% |
| Forecast value added at 7 days | 47.6% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.5% vs 2.4% |

## 5. An edge case from the blueprint

**Fuel price shock.** the cost structure changes suddenly. Planned response: Rapid refresh and regime flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17383 |
| `h1.wmape_model` | 0.11961 |
| `h1.wmape_baseline` | 0.21404 |
| `h1.fva` | 0.44117 |
| `h3.wmape_model` | 0.11603 |
| `h3.wmape_baseline` | 0.21179 |
| `h3.fva` | 0.45214 |
| `h7.wmape_model` | 0.11971 |
| `h7.wmape_baseline` | 0.22828 |
| `h7.fva` | 0.47561 |
| `h14.wmape_model` | 0.14714 |
| `h14.wmape_baseline` | 0.24485 |
| `h14.fva` | 0.39906 |
| `p90_coverage` | 0.89611 |
| `wmape_sku_level` | 0.12523 |
| `wmape_aggregate` | 0.024372 |
| `late_feed.missing_as_zero` | 0.19038 |
| `late_feed.missing_as_nan` | 0.14034 |

</details>
