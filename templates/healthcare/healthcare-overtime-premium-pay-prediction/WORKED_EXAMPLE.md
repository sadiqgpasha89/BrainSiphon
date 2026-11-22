# Healthcare Overtime & Premium Pay Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 2223, knobs {"n_series": 252}, in 50.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements.

**Constraints that shape the design.** Forecasts 60K cost-centre and role series nightly by pay period; Scheduled hours and realised hours are held as separate quantities; The forecast reconciles to payroll definitions of overtime, premium and agency

**Label in this use case.** For "Healthcare Overtime & Premium Pay Prediction": Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using scheduled hours as the target.

## 2. Choose the signals

Your strongest signal is **Vacancy hours** (open budgeted hours per cost centre and role). Its rule: Use the vacancy snapshot at forecast time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.4% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 24.0% for the seasonal baseline, a forecast value added of 49.9%. At 14 days it is 14.6% against 26.4%. The upper band covers 90.2% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 24.0% |
| Forecast value added at 7 days | 49.9% |
| 90th-percentile band coverage | 90.2% |
| Error at SKU level versus aggregate | 12.5% vs 2.4% |

## 5. An edge case from the blueprint

**Retroactive pay adjustment.** past periods change after the fact. Planned response: Restatement table with as-of dates and training on settled periods only. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22938 |
| `h1.wmape_model` | 0.11857 |
| `h1.wmape_baseline` | 0.22434 |
| `h1.fva` | 0.47145 |
| `h3.wmape_model` | 0.11678 |
| `h3.wmape_baseline` | 0.21122 |
| `h3.fva` | 0.44712 |
| `h7.wmape_model` | 0.1201 |
| `h7.wmape_baseline` | 0.23969 |
| `h7.fva` | 0.49891 |
| `h14.wmape_model` | 0.14646 |
| `h14.wmape_baseline` | 0.26351 |
| `h14.fva` | 0.44419 |
| `p90_coverage` | 0.90243 |
| `wmape_sku_level` | 0.12502 |
| `wmape_aggregate` | 0.024315 |
| `late_feed.missing_as_zero` | 0.19251 |
| `late_feed.missing_as_nan` | 0.14391 |

</details>
