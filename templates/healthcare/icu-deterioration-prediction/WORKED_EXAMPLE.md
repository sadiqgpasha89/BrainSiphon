# ICU & Ward Deterioration Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 51872, knobs {"n_series": 208}, in 12.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early.

**Constraints that shape the design.** Hourly refresh; Interpretable risk drivers; Low false-alarm load

**Label in this use case.** For "ICU & Ward Deterioration Prediction": Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrospective labels include interventions caused by model-driven alerts.

## 2. Choose the signals

Your strongest signal is **Vital-sign trend z-scores** (deviation of HR, RR, SpO2 from patient baseline). Its rule: Baseline excludes the prediction window. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.3% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.2% against 21.2% for the seasonal baseline, a forecast value added of 42.4%. At 14 days it is 14.1% against 22.3%. The upper band covers 88.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.2% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 42.4% |
| 90th-percentile band coverage | 88.6% |
| Error at SKU level versus aggregate | 12.3% vs 2.5% |

## 5. An edge case from the blueprint

**Sensor disconnects during bathing.** vital gaps look like stability. Planned response: Missingness-aware model and sensor-status feature. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18913 |
| `h1.wmape_model` | 0.1154 |
| `h1.wmape_baseline` | 0.20245 |
| `h1.fva` | 0.43001 |
| `h3.wmape_model` | 0.1166 |
| `h3.wmape_baseline` | 0.21184 |
| `h3.fva` | 0.44959 |
| `h7.wmape_model` | 0.122 |
| `h7.wmape_baseline` | 0.21179 |
| `h7.fva` | 0.42397 |
| `h14.wmape_model` | 0.1408 |
| `h14.wmape_baseline` | 0.22267 |
| `h14.fva` | 0.36766 |
| `p90_coverage` | 0.88643 |
| `wmape_sku_level` | 0.12333 |
| `wmape_aggregate` | 0.02548 |
| `late_feed.missing_as_zero` | 0.20508 |
| `late_feed.missing_as_nan` | 0.13289 |

</details>
