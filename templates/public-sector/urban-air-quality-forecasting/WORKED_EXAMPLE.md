# Urban Air Quality Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 79146, knobs {"n_series": 184}, in 16.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely.

**Constraints that shape the design.** Hourly forecast for 72 hours; Reference-grade and low-cost sensors reconciled; Health alerts reviewed by public health staff

**Label in this use case.** For "Urban Air Quality Forecasting": Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using raw low-cost readings.

## 2. Choose the signals

Your strongest signal is **Weather forecast** (wind, temperature and stability). Its rule: From weather models. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 22.5% for the seasonal baseline, a forecast value added of 46.1%. At 14 days it is 14.7% against 24.0%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 22.5% |
| Forecast value added at 7 days | 46.1% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.4% vs 2.3% |

## 5. An edge case from the blueprint

**Sensor drift.** low-cost readings degrade. Planned response: Calibration checks against references. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16752 |
| `h1.wmape_model` | 0.11751 |
| `h1.wmape_baseline` | 0.22763 |
| `h1.fva` | 0.48378 |
| `h3.wmape_model` | 0.11344 |
| `h3.wmape_baseline` | 0.21367 |
| `h3.fva` | 0.4691 |
| `h7.wmape_model` | 0.12144 |
| `h7.wmape_baseline` | 0.22524 |
| `h7.fva` | 0.46082 |
| `h14.wmape_model` | 0.14722 |
| `h14.wmape_baseline` | 0.24039 |
| `h14.fva` | 0.38759 |
| `p90_coverage` | 0.89512 |
| `wmape_sku_level` | 0.12424 |
| `wmape_aggregate` | 0.023237 |
| `late_feed.missing_as_zero` | 0.19543 |
| `late_feed.missing_as_nan` | 0.13851 |

</details>
