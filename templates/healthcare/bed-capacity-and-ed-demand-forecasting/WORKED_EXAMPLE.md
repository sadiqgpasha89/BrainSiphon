# ED Demand & Bed Capacity Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 60407, knobs {"n_series": 249}, in 12.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits.

**Constraints that shape the design.** Hourly updates; Surge scenarios; Interpretable for bed managers

**Label in this use case.** For "ED Demand & Bed Capacity Forecasting": Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtesting only in non-surge periods.

## 2. Choose the signals

Your strongest signal is **Syndromic surveillance signals** (ILI, RSV regional counts). Its rule: Reporting lag. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.4% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 22.1% for the seasonal baseline, a forecast value added of 45.2%. At 14 days it is 14.6% against 24.0%. The upper band covers 89.1% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 22.1% |
| Forecast value added at 7 days | 45.2% |
| 90th-percentile band coverage | 89.1% |
| Error at SKU level versus aggregate | 12.4% vs 2.4% |

## 5. An edge case from the blueprint

**Epidemic surge.** forecasts underpredict persistently. Planned response: Surveillance covariates and regime-change detector. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22694 |
| `h1.wmape_model` | 0.11327 |
| `h1.wmape_baseline` | 0.2028 |
| `h1.fva` | 0.4415 |
| `h3.wmape_model` | 0.11632 |
| `h3.wmape_baseline` | 0.21028 |
| `h3.fva` | 0.44682 |
| `h7.wmape_model` | 0.12127 |
| `h7.wmape_baseline` | 0.22122 |
| `h7.fva` | 0.45181 |
| `h14.wmape_model` | 0.14589 |
| `h14.wmape_baseline` | 0.24014 |
| `h14.fva` | 0.39249 |
| `p90_coverage` | 0.89094 |
| `wmape_sku_level` | 0.12396 |
| `wmape_aggregate` | 0.023876 |
| `late_feed.missing_as_zero` | 0.19073 |
| `late_feed.missing_as_nan` | 0.14182 |

</details>
