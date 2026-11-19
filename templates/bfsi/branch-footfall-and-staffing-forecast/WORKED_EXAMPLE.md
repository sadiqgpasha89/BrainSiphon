# Branch Footfall & Staffing Forecast: worked example

> Run on synthetic data with `forecast` engine, seed 79568, knobs {"n_series": 253}, in 7.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast branch visits by hour so rosters match demand and queues stay short.

**Constraints that shape the design.** Rosters are fixed three weeks ahead, so forecasts are needed for 3 to 6 weeks out; Labour rules on hours and breaks are respected; A service-level target for waiting time at each branch

**Label in this use case.** For "Branch Footfall & Staffing Forecast": Forecast branch visits by hour so rosters match demand and queues stay short. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Closed days in the history look like zero demand and bias the forecast.

## 2. Choose the signals

Your strongest signal is **Hourly profile** (median visits by hour for each day type, such as normal, pay day or holiday). Its rule: Closures and refits distort it, so exclude them. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.5% against 20.7% for the seasonal baseline, a forecast value added of 44.1%. At 14 days it is 15.0% against 22.3%. The upper band covers 88.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.5% |
| WAPE at 7 days, seasonal baseline | 20.7% |
| Forecast value added at 7 days | 44.1% |
| 90th-percentile band coverage | 88.8% |
| Error at SKU level versus aggregate | 12.4% vs 2.3% |

## 5. An edge case from the blueprint

**Branch refit.** Closed or refit days in the history look like zero demand and bias the forecast. Planned response: Mark closures as exclusions and impute from comparable open days. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 23002 |
| `h1.wmape_model` | 0.11199 |
| `h1.wmape_baseline` | 0.19735 |
| `h1.fva` | 0.43255 |
| `h3.wmape_model` | 0.1188 |
| `h3.wmape_baseline` | 0.21614 |
| `h3.fva` | 0.45035 |
| `h7.wmape_model` | 0.11546 |
| `h7.wmape_baseline` | 0.20658 |
| `h7.fva` | 0.44108 |
| `h14.wmape_model` | 0.15008 |
| `h14.wmape_baseline` | 0.22265 |
| `h14.fva` | 0.32592 |
| `p90_coverage` | 0.88757 |
| `wmape_sku_level` | 0.12359 |
| `wmape_aggregate` | 0.023465 |
| `late_feed.missing_as_zero` | 0.19113 |
| `late_feed.missing_as_nan` | 0.14284 |

</details>
