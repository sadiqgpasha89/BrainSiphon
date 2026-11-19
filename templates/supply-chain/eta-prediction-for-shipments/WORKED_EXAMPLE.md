# Shipment ETA Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 4650, knobs {"n_series": 186}, in 6.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit.

**Constraints that shape the design.** ETA refresh on every scan or ping; 50 ms API; Multimodal journeys

**Label in this use case.** For "Shipment ETA Prediction": Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on delivered shipments.

## 2. Choose the signals

Your strongest signal is **Hub dwell-time distribution** (recent dwell quantiles at the next hub). Its rule: Window before prediction. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 22.5% for the seasonal baseline, a forecast value added of 46.9%. At 14 days it is 15.3% against 24.1%. The upper band covers 88.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 22.5% |
| Forecast value added at 7 days | 46.9% |
| 90th-percentile band coverage | 88.4% |
| Error at SKU level versus aggregate | 12.5% vs 2.5% |

## 5. An edge case from the blueprint

**GPS gaps in tunnels or warehouses.** ETA freezes or jumps. Planned response: Last-known state plus dead-reckoning confidence widening. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16946 |
| `h1.wmape_model` | 0.11682 |
| `h1.wmape_baseline` | 0.21702 |
| `h1.fva` | 0.4617 |
| `h3.wmape_model` | 0.11225 |
| `h3.wmape_baseline` | 0.20645 |
| `h3.fva` | 0.45628 |
| `h7.wmape_model` | 0.11943 |
| `h7.wmape_baseline` | 0.22489 |
| `h7.fva` | 0.46894 |
| `h14.wmape_model` | 0.15293 |
| `h14.wmape_baseline` | 0.24137 |
| `h14.fva` | 0.3664 |
| `p90_coverage` | 0.8841 |
| `wmape_sku_level` | 0.12494 |
| `wmape_aggregate` | 0.025136 |
| `late_feed.missing_as_zero` | 0.19753 |
| `late_feed.missing_as_nan` | 0.14221 |

</details>
