# Cash-Flow Forecasting for Small Businesses: worked example

> Run on synthetic data with `forecast` engine, seed 54635, knobs {"n_series": 289}, in 8.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice.

**Constraints that shape the design.** 5M businesses forecast nightly; Prediction intervals required; Invoice-level explainability

**Label in this use case.** For "Cash-Flow Forecasting for Small Businesses": Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random cross-validation across time.

## 2. Choose the signals

Your strongest signal is **Recurring payment schedule** (detected periodic outflows with amount and day pattern). Its rule: Detect only on data before forecast origin. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.8% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.5% against 21.2% for the seasonal baseline, a forecast value added of 41.1%. At 14 days it is 15.0% against 22.6%. The upper band covers 89.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.5% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 41.1% |
| 90th-percentile band coverage | 89.4% |
| Error at SKU level versus aggregate | 12.8% vs 2.2% |

## 5. An edge case from the blueprint

**Large one-off tax payment.** forecast breaks. Planned response: Calendar of statutory dates as known-future covariates. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 26195 |
| `h1.wmape_model` | 0.12022 |
| `h1.wmape_baseline` | 0.21326 |
| `h1.fva` | 0.43629 |
| `h3.wmape_model` | 0.11782 |
| `h3.wmape_baseline` | 0.21103 |
| `h3.fva` | 0.44168 |
| `h7.wmape_model` | 0.12496 |
| `h7.wmape_baseline` | 0.21219 |
| `h7.fva` | 0.41108 |
| `h14.wmape_model` | 0.15002 |
| `h14.wmape_baseline` | 0.22622 |
| `h14.fva` | 0.33683 |
| `p90_coverage` | 0.89357 |
| `wmape_sku_level` | 0.12768 |
| `wmape_aggregate` | 0.022261 |
| `late_feed.missing_as_zero` | 0.20559 |
| `late_feed.missing_as_nan` | 0.14286 |

</details>
