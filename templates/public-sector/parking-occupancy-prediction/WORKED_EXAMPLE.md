# Parking Occupancy Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 79289, knobs {"n_series": 170}, in 17.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand.

**Constraints that shape the design.** Forecast to 3 hours at 15-minute resolution; Aggregated occupancy only; No tracking of plates

**Label in this use case.** For "Parking Occupancy Prediction": Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Plate-level tracking.

## 2. Choose the signals

Your strongest signal is **Current occupancy** (occupancy now by zone). Its rule: From sensors and payments. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.0% for the seasonal baseline, a forecast value added of 43.3%. At 14 days it is 14.9% against 23.0%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.0% |
| Forecast value added at 7 days | 43.3% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.5% vs 2.5% |

## 5. An edge case from the blueprint

**Sensor outage.** a zone loses data. Planned response: Payment-only estimates and flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15464 |
| `h1.wmape_model` | 0.11696 |
| `h1.wmape_baseline` | 0.20703 |
| `h1.fva` | 0.43509 |
| `h3.wmape_model` | 0.1165 |
| `h3.wmape_baseline` | 0.21503 |
| `h3.fva` | 0.45819 |
| `h7.wmape_model` | 0.11907 |
| `h7.wmape_baseline` | 0.20983 |
| `h7.fva` | 0.43253 |
| `h14.wmape_model` | 0.14947 |
| `h14.wmape_baseline` | 0.23034 |
| `h14.fva` | 0.35108 |
| `p90_coverage` | 0.89621 |
| `wmape_sku_level` | 0.12493 |
| `wmape_aggregate` | 0.024591 |
| `late_feed.missing_as_zero` | 0.19678 |
| `late_feed.missing_as_nan` | 0.14546 |

</details>
