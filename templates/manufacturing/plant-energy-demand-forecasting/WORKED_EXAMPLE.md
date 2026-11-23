# Plant Energy Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 29641, knobs {"n_series": 154}, in 14.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast electricity, gas and steam demand for a plant by interval so purchasing, peak management and on-site generation plans use realistic loads.

**Constraints that shape the design.** 15-minute resolution for 7 days ahead; Quantile output for peak risk; Production plan used as input

**Label in this use case.** For "Plant Energy Demand Forecasting": Forecast electricity, gas and steam demand for a plant by interval so purchasing, peak management and on-site generation plans use realistic loads. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mean-only forecasts.

## 2. Choose the signals

Your strongest signal is **Planned production by line** (scheduled hours and output). Its rule: From planning. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 20.4% for the seasonal baseline, a forecast value added of 41.6%. At 14 days it is 15.1% against 21.5%. The upper band covers 89.3% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 20.4% |
| Forecast value added at 7 days | 41.6% |
| 90th-percentile band coverage | 89.3% |
| Error at SKU level versus aggregate | 12.6% vs 2.3% |

## 5. An edge case from the blueprint

**Plan change.** production shifts at short notice. Planned response: Update the forecast on plan changes. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13963 |
| `h1.wmape_model` | 0.11937 |
| `h1.wmape_baseline` | 0.19726 |
| `h1.fva` | 0.39486 |
| `h3.wmape_model` | 0.11674 |
| `h3.wmape_baseline` | 0.21521 |
| `h3.fva` | 0.45755 |
| `h7.wmape_model` | 0.11931 |
| `h7.wmape_baseline` | 0.20438 |
| `h7.fva` | 0.41623 |
| `h14.wmape_model` | 0.15129 |
| `h14.wmape_baseline` | 0.2152 |
| `h14.fva` | 0.29701 |
| `p90_coverage` | 0.893 |
| `wmape_sku_level` | 0.12609 |
| `wmape_aggregate` | 0.023312 |
| `late_feed.missing_as_zero` | 0.26147 |
| `late_feed.missing_as_nan` | 0.14164 |

</details>
