# Office Space Utilisation from Sensors: worked example

> Run on synthetic data with `forecast` engine, seed 45978, knobs {"n_series": 278}, in 7.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.

**Constraints that shape the design.** No tracking of individuals at any step; Only aggregate counts are stored or shown; Reports remain valid with gaps in sensor data

**Label in this use case.** For "Office Space Utilisation from Sensors": Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A short pilot period misses seasonal peaks and holidays.

## 2. Choose the signals

Your strongest signal is **Peak occupancy** (95th percentile of hourly counts per zone over four weeks). Its rule: Sensor errors create spikes, so remove impossible values. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.3% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.5% against 19.5% for the seasonal baseline, a forecast value added of 41.0%. At 14 days it is 14.3% against 20.6%. The upper band covers 89.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.5% |
| WAPE at 7 days, seasonal baseline | 19.5% |
| Forecast value added at 7 days | 41.0% |
| 90th-percentile band coverage | 89.7% |
| Error at SKU level versus aggregate | 12.3% vs 2.2% |

## 5. An edge case from the blueprint

**Sensor failure.** Sensor failures create gaps in the occupancy counts. Planned response: Impute from nearby sensors and mark the interval as estimated. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25280 |
| `h1.wmape_model` | 0.1155 |
| `h1.wmape_baseline` | 0.21162 |
| `h1.fva` | 0.45423 |
| `h3.wmape_model` | 0.11822 |
| `h3.wmape_baseline` | 0.21776 |
| `h3.fva` | 0.45712 |
| `h7.wmape_model` | 0.11487 |
| `h7.wmape_baseline` | 0.19481 |
| `h7.fva` | 0.41036 |
| `h14.wmape_model` | 0.14304 |
| `h14.wmape_baseline` | 0.20625 |
| `h14.fva` | 0.30649 |
| `p90_coverage` | 0.8966 |
| `wmape_sku_level` | 0.12252 |
| `wmape_aggregate` | 0.022336 |
| `late_feed.missing_as_zero` | 0.19018 |
| `late_feed.missing_as_nan` | 0.14332 |

</details>
