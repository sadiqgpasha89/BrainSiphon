# Short-Term Load Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 71841, knobs {"n_series": 282}, in 25.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads.

**Constraints that shape the design.** 15-minute resolution for 7 days ahead; Quantile output for peak risk; Consistent totals across the hierarchy

**Label in this use case.** For "Short-Term Load Forecasting": Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mean-only forecasts.

## 2. Choose the signals

Your strongest signal is **Temperature forecast** (forecast temperature and humidity). Its rule: Forecast not actual. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.9% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 20.4% for the seasonal baseline, a forecast value added of 42.3%. At 14 days it is 14.4% against 22.1%. The upper band covers 89.1% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 20.4% |
| Forecast value added at 7 days | 42.3% |
| 90th-percentile band coverage | 89.1% |
| Error at SKU level versus aggregate | 12.4% vs 2.9% |

## 5. An edge case from the blueprint

**Heatwave.** demand moves beyond history. Planned response: Wider intervals and an extreme weather model. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25588 |
| `h1.wmape_model` | 0.11853 |
| `h1.wmape_baseline` | 0.20521 |
| `h1.fva` | 0.42242 |
| `h3.wmape_model` | 0.11671 |
| `h3.wmape_baseline` | 0.19532 |
| `h3.fva` | 0.40246 |
| `h7.wmape_model` | 0.11742 |
| `h7.wmape_baseline` | 0.20357 |
| `h7.fva` | 0.42321 |
| `h14.wmape_model` | 0.14442 |
| `h14.wmape_baseline` | 0.22065 |
| `h14.fva` | 0.34547 |
| `p90_coverage` | 0.89081 |
| `wmape_sku_level` | 0.12416 |
| `wmape_aggregate` | 0.028751 |
| `late_feed.missing_as_zero` | 0.19912 |
| `late_feed.missing_as_nan` | 0.14253 |

</details>
