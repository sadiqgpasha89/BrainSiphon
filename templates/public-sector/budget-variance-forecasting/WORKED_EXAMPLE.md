# Public Budget Variance Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 33305, knobs {"n_series": 165}, in 16.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls.

**Constraints that shape the design.** Monthly forecast to year end with ranges; Drivers explained by line item; Finance staff review

**Label in this use case.** For "Public Budget Variance Forecasting": Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Straight-line projections.

## 2. Choose the signals

Your strongest signal is **Spend to date against profile** (year-to-date spend against seasonal profile). Its rule: From finance. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.8% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.6% against 21.2% for the seasonal baseline, a forecast value added of 45.4%. At 14 days it is 14.5% against 22.9%. The upper band covers 89.0% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.6% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 45.4% |
| 90th-percentile band coverage | 89.0% |
| Error at SKU level versus aggregate | 12.6% vs 2.8% |

## 5. An edge case from the blueprint

**Late invoices.** spend is understated. Planned response: Commitment-based adjustments. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15016 |
| `h1.wmape_model` | 0.12466 |
| `h1.wmape_baseline` | 0.21836 |
| `h1.fva` | 0.42909 |
| `h3.wmape_model` | 0.11867 |
| `h3.wmape_baseline` | 0.21358 |
| `h3.fva` | 0.44436 |
| `h7.wmape_model` | 0.11558 |
| `h7.wmape_baseline` | 0.21183 |
| `h7.fva` | 0.45437 |
| `h14.wmape_model` | 0.14469 |
| `h14.wmape_baseline` | 0.22906 |
| `h14.fva` | 0.36834 |
| `p90_coverage` | 0.89025 |
| `wmape_sku_level` | 0.1257 |
| `wmape_aggregate` | 0.028439 |
| `late_feed.missing_as_zero` | 0.17598 |
| `late_feed.missing_as_nan` | 0.14113 |

</details>
