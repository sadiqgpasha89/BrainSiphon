# Volatility Forecasting for Risk & Options: worked example

> Run on synthetic data with `forecast` engine, seed 28764, knobs {"n_series": 279}, in 15.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage.

**Constraints that shape the design.** Coverage tests for VaR (Kupiec); Nightly for 50k instruments; Intraday refresh for top 500

**Label in this use case.** For "Volatility Forecasting for Risk & Options": Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating against squared returns instead of RV.

## 2. Choose the signals

Your strongest signal is **Realised variance components** (daily, weekly, monthly RV averages). Its rule: Intraday RV needs clean tick data. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 1.9% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 20.8% for the seasonal baseline, a forecast value added of 43.0%. At 14 days it is 14.8% against 22.1%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 20.8% |
| Forecast value added at 7 days | 43.0% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.4% vs 1.9% |

## 5. An edge case from the blueprint

**Bad ticks inflate realised vol.** forecast explodes. Planned response: Robust filtering and outlier-aware estimators. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25334 |
| `h1.wmape_model` | 0.11624 |
| `h1.wmape_baseline` | 0.20099 |
| `h1.fva` | 0.42165 |
| `h3.wmape_model` | 0.11503 |
| `h3.wmape_baseline` | 0.21593 |
| `h3.fva` | 0.46729 |
| `h7.wmape_model` | 0.11873 |
| `h7.wmape_baseline` | 0.20814 |
| `h7.fva` | 0.42954 |
| `h14.wmape_model` | 0.14822 |
| `h14.wmape_baseline` | 0.22103 |
| `h14.fva` | 0.32942 |
| `p90_coverage` | 0.89603 |
| `wmape_sku_level` | 0.12392 |
| `wmape_aggregate` | 0.018827 |
| `late_feed.missing_as_zero` | 0.18975 |
| `late_feed.missing_as_nan` | 0.13857 |

</details>
