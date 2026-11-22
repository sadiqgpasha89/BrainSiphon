# Physician Demand & Coverage Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 72811, knobs {"n_series": 251}, in 51.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand.

**Constraints that shape the design.** Medical group leaders approve coverage plans and the forecast never changes a schedule; Hierarchical reconciliation across specialty, site and shift keeps totals consistent; Forecasts state intervals and the drivers

**Label in this use case.** For "Physician Demand & Coverage Forecasting": Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on random splits.

## 2. Choose the signals

Your strongest signal is **Booked and referred demand** (appointments and referrals already scheduled). Its rule: Snapshot at forecast time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.3% for the seasonal baseline, a forecast value added of 43.1%. At 14 days it is 15.1% against 23.0%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.3% |
| Forecast value added at 7 days | 43.1% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.6% vs 2.5% |

## 5. An edge case from the blueprint

**New clinic or service line.** no history. Planned response: Peer prior and a low-confidence flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22844 |
| `h1.wmape_model` | 0.11336 |
| `h1.wmape_baseline` | 0.2066 |
| `h1.fva` | 0.45128 |
| `h3.wmape_model` | 0.11933 |
| `h3.wmape_baseline` | 0.22147 |
| `h3.fva` | 0.46121 |
| `h7.wmape_model` | 0.12107 |
| `h7.wmape_baseline` | 0.2127 |
| `h7.fva` | 0.4308 |
| `h14.wmape_model` | 0.15082 |
| `h14.wmape_baseline` | 0.2298 |
| `h14.fva` | 0.3437 |
| `p90_coverage` | 0.8956 |
| `wmape_sku_level` | 0.12559 |
| `wmape_aggregate` | 0.024513 |
| `late_feed.missing_as_zero` | 0.18481 |
| `late_feed.missing_as_nan` | 0.14151 |

</details>
