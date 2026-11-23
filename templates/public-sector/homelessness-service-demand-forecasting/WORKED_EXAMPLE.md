# Homelessness Service Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 72622, knobs {"n_series": 294}, in 27.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals.

**Constraints that shape the design.** Aggregated counts by area and service; No individual risk scoring; Scenario ranges for winter and economic shocks

**Label in this use case.** For "Homelessness Service Demand Forecasting": Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual risk scoring.

## 2. Choose the signals

Your strongest signal is **Past service use** (counts by service and month). Its rule: From services. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.9% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.8% against 22.4% for the seasonal baseline, a forecast value added of 47.5%. At 14 days it is 15.1% against 23.6%. The upper band covers 88.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.8% |
| WAPE at 7 days, seasonal baseline | 22.4% |
| Forecast value added at 7 days | 47.5% |
| 90th-percentile band coverage | 88.7% |
| Error at SKU level versus aggregate | 12.6% vs 2.9% |

## 5. An edge case from the blueprint

**Reporting gaps.** providers report late. Planned response: Nowcasting and flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 26769 |
| `h1.wmape_model` | 0.11901 |
| `h1.wmape_baseline` | 0.2332 |
| `h1.fva` | 0.48968 |
| `h3.wmape_model` | 0.11801 |
| `h3.wmape_baseline` | 0.21409 |
| `h3.fva` | 0.4488 |
| `h7.wmape_model` | 0.11778 |
| `h7.wmape_baseline` | 0.22417 |
| `h7.fva` | 0.47459 |
| `h14.wmape_model` | 0.15116 |
| `h14.wmape_baseline` | 0.23568 |
| `h14.fva` | 0.35863 |
| `p90_coverage` | 0.88711 |
| `wmape_sku_level` | 0.12618 |
| `wmape_aggregate` | 0.029264 |
| `late_feed.missing_as_zero` | 0.18592 |
| `late_feed.missing_as_nan` | 0.13931 |

</details>
