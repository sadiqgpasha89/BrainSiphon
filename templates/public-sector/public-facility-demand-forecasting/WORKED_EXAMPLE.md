# Public Facility Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 86125, knobs {"n_series": 299}, in 27.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand.

**Constraints that shape the design.** Aggregated visit counts only; Equity targets for access; Weather and event inputs

**Label in this use case.** For "Public Facility Demand Forecasting": Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Maximising use only.

## 2. Choose the signals

Your strongest signal is **Past visits by hour and day** (counts by site). Its rule: From counters. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 22.5% for the seasonal baseline, a forecast value added of 46.4%. At 14 days it is 14.8% against 24.0%. The upper band covers 90.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 22.5% |
| Forecast value added at 7 days | 46.4% |
| 90th-percentile band coverage | 90.4% |
| Error at SKU level versus aggregate | 12.6% vs 2.3% |

## 5. An edge case from the blueprint

**Counter fault.** counts are wrong. Planned response: Data quality checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 27124 |
| `h1.wmape_model` | 0.1195 |
| `h1.wmape_baseline` | 0.22643 |
| `h1.fva` | 0.47227 |
| `h3.wmape_model` | 0.11715 |
| `h3.wmape_baseline` | 0.2242 |
| `h3.fva` | 0.47746 |
| `h7.wmape_model` | 0.12048 |
| `h7.wmape_baseline` | 0.22459 |
| `h7.fva` | 0.46355 |
| `h14.wmape_model` | 0.1483 |
| `h14.wmape_baseline` | 0.23988 |
| `h14.fva` | 0.38177 |
| `p90_coverage` | 0.90366 |
| `wmape_sku_level` | 0.12587 |
| `wmape_aggregate` | 0.022868 |
| `late_feed.missing_as_zero` | 0.19456 |
| `late_feed.missing_as_nan` | 0.14158 |

</details>
