# API Usage Forecasting & Quota Planning: worked example

> Run on synthetic data with `forecast` engine, seed 24915, knobs {"n_series": 158}, in 4.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue.

**Constraints that shape the design.** Thousands of customers with different scales; Launch spikes; Quota fairness

**Label in this use case.** For "API Usage Forecasting & Quota Planning": Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on throttled usage as true demand.

## 2. Choose the signals

Your strongest signal is **Usage trend and seasonality** (decomposed trend and weekly cycle). Its rule: Window. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.4% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.3% for the seasonal baseline, a forecast value added of 43.5%. At 14 days it is 15.1% against 23.1%. The upper band covers 88.0% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.3% |
| Forecast value added at 7 days | 43.5% |
| 90th-percentile band coverage | 88.0% |
| Error at SKU level versus aggregate | 12.6% vs 3.4% |

## 5. An edge case from the blueprint

**Customer launches a new integration.** usage jumps tenfold. Planned response: Event feeds from CSMs and early-warning detectors. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14313 |
| `h1.wmape_model` | 0.11738 |
| `h1.wmape_baseline` | 0.20661 |
| `h1.fva` | 0.43187 |
| `h3.wmape_model` | 0.11548 |
| `h3.wmape_baseline` | 0.20801 |
| `h3.fva` | 0.44482 |
| `h7.wmape_model` | 0.12066 |
| `h7.wmape_baseline` | 0.21342 |
| `h7.fva` | 0.43462 |
| `h14.wmape_model` | 0.15149 |
| `h14.wmape_baseline` | 0.23082 |
| `h14.fva` | 0.34368 |
| `p90_coverage` | 0.87969 |
| `wmape_sku_level` | 0.1259 |
| `wmape_aggregate` | 0.034073 |
| `late_feed.missing_as_zero` | 0.1884 |
| `late_feed.missing_as_nan` | 0.14357 |

</details>
