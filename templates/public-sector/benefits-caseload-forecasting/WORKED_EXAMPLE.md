# Benefits Office Caseload Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 37869, knobs {"n_series": 169}, in 16.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand.

**Constraints that shape the design.** Weekly forecast for 26 weeks; Interval output; Policy changes and deadlines as inputs

**Label in this use case.** For "Benefits Office Caseload Forecasting": Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: History-only forecasts.

## 2. Choose the signals

Your strongest signal is **Past applications and calls** (weekly counts by service). Its rule: From case systems. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.1% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 22.7% for the seasonal baseline, a forecast value added of 47.4%. At 14 days it is 15.1% against 24.5%. The upper band covers 88.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 22.7% |
| Forecast value added at 7 days | 47.4% |
| 90th-percentile band coverage | 88.8% |
| Error at SKU level versus aggregate | 12.6% vs 3.1% |

## 5. An edge case from the blueprint

**Policy surge.** new rules create sudden demand. Planned response: Scenario inputs from policy teams. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15371 |
| `h1.wmape_model` | 0.11629 |
| `h1.wmape_baseline` | 0.2241 |
| `h1.fva` | 0.48108 |
| `h3.wmape_model` | 0.11737 |
| `h3.wmape_baseline` | 0.21178 |
| `h3.fva` | 0.44582 |
| `h7.wmape_model` | 0.1192 |
| `h7.wmape_baseline` | 0.22659 |
| `h7.fva` | 0.47393 |
| `h14.wmape_model` | 0.15117 |
| `h14.wmape_baseline` | 0.2455 |
| `h14.fva` | 0.38424 |
| `p90_coverage` | 0.88836 |
| `wmape_sku_level` | 0.12554 |
| `wmape_aggregate` | 0.030662 |
| `late_feed.missing_as_zero` | 0.18551 |
| `late_feed.missing_as_nan` | 0.14059 |

</details>
