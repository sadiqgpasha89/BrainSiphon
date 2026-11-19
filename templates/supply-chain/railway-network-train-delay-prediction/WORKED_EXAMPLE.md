# Railway Network Train Delay Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 48395, knobs {"n_series": 212}, in 7.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict train delays and propagation across the network to support dispatchers and passenger information.

**Constraints that shape the design.** Real-time updates every 30 s; Safety-critical separation; Delay propagation through shared infrastructure

**Label in this use case.** For "Railway Network Train Delay Prediction": Predict train delays and propagation across the network to support dispatchers and passenger information. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on normal days only.

## 2. Choose the signals

Your strongest signal is **Current delay and buffer ahead** (delay minus remaining buffer). Its rule: Timetable data. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.4% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.3% for the seasonal baseline, a forecast value added of 44.2%. At 14 days it is 14.9% against 22.4%. The upper band covers 89.3% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.3% |
| Forecast value added at 7 days | 44.2% |
| 90th-percentile band coverage | 89.3% |
| Error at SKU level versus aggregate | 12.5% vs 2.4% |

## 5. An edge case from the blueprint

**Signalling failure.** positions stale. Planned response: Staleness handling and fallback to timetable. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19287 |
| `h1.wmape_model` | 0.11677 |
| `h1.wmape_baseline` | 0.21603 |
| `h1.fva` | 0.45949 |
| `h3.wmape_model` | 0.11769 |
| `h3.wmape_baseline` | 0.21302 |
| `h3.fva` | 0.44753 |
| `h7.wmape_model` | 0.11874 |
| `h7.wmape_baseline` | 0.21292 |
| `h7.fva` | 0.44232 |
| `h14.wmape_model` | 0.14856 |
| `h14.wmape_baseline` | 0.2239 |
| `h14.fva` | 0.33649 |
| `p90_coverage` | 0.89324 |
| `wmape_sku_level` | 0.12484 |
| `wmape_aggregate` | 0.024302 |
| `late_feed.missing_as_zero` | 0.20351 |
| `late_feed.missing_as_nan` | 0.146 |

</details>
