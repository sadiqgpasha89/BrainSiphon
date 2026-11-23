# Feeder Fault Location from Waveforms: worked example

> Run on synthetic data with `forecast` engine, seed 41017, knobs {"n_series": 203}, in 19.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster.

**Constraints that shape the design.** Candidate span list within 30 s of the fault; Top three spans cover the true location at least 85% of the time; Works with sparse measurement points

**Label in this use case.** For "Feeder Fault Location from Waveforms": Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learning without a network model.

## 2. Choose the signals

Your strongest signal is **Apparent impedance to the fault** (impedance computed from relay phasors). Its rule: Needs the feeder model. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 20.4% for the seasonal baseline, a forecast value added of 41.6%. At 14 days it is 14.9% against 21.7%. The upper band covers 89.2% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 20.4% |
| Forecast value added at 7 days | 41.6% |
| 90th-percentile band coverage | 89.2% |
| Error at SKU level versus aggregate | 12.7% vs 2.5% |

## 5. An edge case from the blueprint

**Wrong topology.** the model has the wrong switch state. Planned response: Check the live state and flag stale models. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18455 |
| `h1.wmape_model` | 0.11986 |
| `h1.wmape_baseline` | 0.21035 |
| `h1.fva` | 0.43016 |
| `h3.wmape_model` | 0.12262 |
| `h3.wmape_baseline` | 0.22496 |
| `h3.fva` | 0.45491 |
| `h7.wmape_model` | 0.11913 |
| `h7.wmape_baseline` | 0.20405 |
| `h7.fva` | 0.41619 |
| `h14.wmape_model` | 0.14855 |
| `h14.wmape_baseline` | 0.21711 |
| `h14.fva` | 0.31579 |
| `p90_coverage` | 0.89222 |
| `wmape_sku_level` | 0.12696 |
| `wmape_aggregate` | 0.025094 |
| `late_feed.missing_as_zero` | 0.20477 |
| `late_feed.missing_as_nan` | 0.14647 |

</details>
