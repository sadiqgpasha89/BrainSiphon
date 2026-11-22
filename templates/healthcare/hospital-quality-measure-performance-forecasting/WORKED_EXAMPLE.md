# Hospital Quality Measure Performance Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 86509, knobs {"n_series": 198}, in 39.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result.

**Constraints that shape the design.** Forecasts 8K measure-by-unit series monthly and weekly where volume allows; Measure logic is versioned and denominators are validated before any forecast; Reporting lag and data completeness are modelled explicitly

**Label in this use case.** For "Hospital Quality Measure Performance Forecasting": Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtesting on final data without reporting lag.

## 2. Choose the signals

Your strongest signal is **Risk-adjusted rate trend** (rolling observed to expected ratio with case-mix adjustment). Its rule: Use the final adjusted data. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.2% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.5% against 22.2% for the seasonal baseline, a forecast value added of 48.1%. At 14 days it is 14.2% against 23.9%. The upper band covers 89.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.5% |
| WAPE at 7 days, seasonal baseline | 22.2% |
| Forecast value added at 7 days | 48.1% |
| 90th-percentile band coverage | 89.7% |
| Error at SKU level versus aggregate | 12.2% vs 2.2% |

## 5. An edge case from the blueprint

**Measure specification changes.** history is no longer comparable. Planned response: Version tag per series and a break in the training window. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18023 |
| `h1.wmape_model` | 0.11652 |
| `h1.wmape_baseline` | 0.21737 |
| `h1.fva` | 0.46396 |
| `h3.wmape_model` | 0.11647 |
| `h3.wmape_baseline` | 0.21978 |
| `h3.fva` | 0.47008 |
| `h7.wmape_model` | 0.11541 |
| `h7.wmape_baseline` | 0.22236 |
| `h7.fva` | 0.48096 |
| `h14.wmape_model` | 0.1417 |
| `h14.wmape_baseline` | 0.23858 |
| `h14.fva` | 0.40605 |
| `p90_coverage` | 0.89735 |
| `wmape_sku_level` | 0.12242 |
| `wmape_aggregate` | 0.022158 |
| `late_feed.missing_as_zero` | 0.17701 |
| `late_feed.missing_as_nan` | 0.13955 |

</details>
