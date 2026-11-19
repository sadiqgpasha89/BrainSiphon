# Connected-TV Ad Avails & Reach Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 70250, knobs {"n_series": 232}, in 14.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast ad avails and campaign reach on connected TV across apps and household devices.

**Constraints that shape the design.** Household-level counting; Live-event spikes; Panel calibration

**Label in this use case.** For "Connected-TV Ad Avails & Reach Forecasting": Forecast ad avails and campaign reach on connected TV across apps and household devices. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating impressions not reach.

## 2. Choose the signals

Your strongest signal is **Household viewing frequency distribution** (impressions per household). Its rule: Measurement. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.3% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.1% for the seasonal baseline, a forecast value added of 43.3%. At 14 days it is 14.4% against 22.7%. The upper band covers 88.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.1% |
| Forecast value added at 7 days | 43.3% |
| 90th-percentile band coverage | 88.9% |
| Error at SKU level versus aggregate | 12.3% vs 2.6% |

## 5. An edge case from the blueprint

**Streaming service launches new tier.** a new subscription tier shifts supply and viewing patterns that the forecast has never seen. Planned response: Tier-aware features and manual overrides. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21013 |
| `h1.wmape_model` | 0.11408 |
| `h1.wmape_baseline` | 0.19874 |
| `h1.fva` | 0.42599 |
| `h3.wmape_model` | 0.11708 |
| `h3.wmape_baseline` | 0.21468 |
| `h3.fva` | 0.45464 |
| `h7.wmape_model` | 0.11936 |
| `h7.wmape_baseline` | 0.21056 |
| `h7.fva` | 0.43315 |
| `h14.wmape_model` | 0.14404 |
| `h14.wmape_baseline` | 0.22676 |
| `h14.fva` | 0.36481 |
| `p90_coverage` | 0.8895 |
| `wmape_sku_level` | 0.12326 |
| `wmape_aggregate` | 0.02612 |
| `late_feed.missing_as_zero` | 0.18438 |
| `late_feed.missing_as_nan` | 0.138 |

</details>
