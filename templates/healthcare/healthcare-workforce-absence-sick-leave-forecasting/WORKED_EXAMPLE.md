# Healthcare Workforce Absence & Sick Leave Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 85157, knobs {"n_series": 228}, in 46.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health.

**Constraints that shape the design.** Forecasts 30K unit-shift-role series nightly of absence counts and rates; Aggregate counts with small-cell suppression and no individual-level output; No health inference about any person and no reason codes in the model

**Label in this use case.** For "Healthcare Workforce Absence & Sick Leave Forecasting": Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training with individual reasons.

## 2. Choose the signals

Your strongest signal is **Weekday and season profile** (day-of-week and week-of-year effects per unit). Its rule: Fit on past periods only. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.1% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 20.3% for the seasonal baseline, a forecast value added of 40.5%. At 14 days it is 14.8% against 21.9%. The upper band covers 88.0% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 20.3% |
| Forecast value added at 7 days | 40.5% |
| 90th-percentile band coverage | 88.0% |
| Error at SKU level versus aggregate | 12.5% vs 3.1% |

## 5. An edge case from the blueprint

**Small unit with sparse counts.** unstable estimates. Planned response: Pool with peer units above the minimum size. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20735 |
| `h1.wmape_model` | 0.11947 |
| `h1.wmape_baseline` | 0.20083 |
| `h1.fva` | 0.40512 |
| `h3.wmape_model` | 0.11325 |
| `h3.wmape_baseline` | 0.20511 |
| `h3.fva` | 0.44784 |
| `h7.wmape_model` | 0.12097 |
| `h7.wmape_baseline` | 0.20324 |
| `h7.fva` | 0.40477 |
| `h14.wmape_model` | 0.14766 |
| `h14.wmape_baseline` | 0.21904 |
| `h14.fva` | 0.32588 |
| `p90_coverage` | 0.87967 |
| `wmape_sku_level` | 0.12492 |
| `wmape_aggregate` | 0.03082 |
| `late_feed.missing_as_zero` | 0.19665 |
| `late_feed.missing_as_nan` | 0.14281 |

</details>
