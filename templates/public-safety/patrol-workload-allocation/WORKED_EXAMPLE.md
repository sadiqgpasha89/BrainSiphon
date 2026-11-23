# Patrol Workload Allocation from Calls for Service: worked example

> Run on synthetic data with `forecast` engine, seed 60970, knobs {"n_series": 176}, in 17.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity.

**Constraints that shape the design.** Workload from calls for service not from arrests; No individual or place-level crime prediction; Supervisors and community boards review plans

**Label in this use case.** For "Patrol Workload Allocation from Calls for Service": Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Crime prediction.

## 2. Choose the signals

Your strongest signal is **Calls for service workload** (counts by beat and hour). Its rule: From CAD. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 21.8% for the seasonal baseline, a forecast value added of 46.1%. At 14 days it is 15.1% against 23.6%. The upper band covers 89.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 21.8% |
| Forecast value added at 7 days | 46.1% |
| 90th-percentile band coverage | 89.7% |
| Error at SKU level versus aggregate | 12.5% vs 2.2% |

## 5. An edge case from the blueprint

**Reporting bias.** some areas report less. Planned response: Reporting rate checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 16039 |
| `h1.wmape_model` | 0.11762 |
| `h1.wmape_baseline` | 0.22007 |
| `h1.fva` | 0.46555 |
| `h3.wmape_model` | 0.11629 |
| `h3.wmape_baseline` | 0.21226 |
| `h3.fva` | 0.45213 |
| `h7.wmape_model` | 0.11733 |
| `h7.wmape_baseline` | 0.21767 |
| `h7.fva` | 0.46098 |
| `h14.wmape_model` | 0.15108 |
| `h14.wmape_baseline` | 0.23627 |
| `h14.fva` | 0.36054 |
| `p90_coverage` | 0.8965 |
| `wmape_sku_level` | 0.12471 |
| `wmape_aggregate` | 0.021717 |
| `late_feed.missing_as_zero` | 0.1963 |
| `late_feed.missing_as_nan` | 0.13587 |

</details>
