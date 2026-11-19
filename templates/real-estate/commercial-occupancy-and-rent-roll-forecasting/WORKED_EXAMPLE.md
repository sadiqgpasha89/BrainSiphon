# Commercial Occupancy & Rent-Roll Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 65878, knobs {"n_series": 161}, in 10.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.

**Constraints that shape the design.** The forecast is built lease by lease and reconciles to the current rent roll; Updated every quarter with a record of changes; Downside, base and upside scenarios shown together

**Label in this use case.** For "Commercial Occupancy & Rent-Roll Forecasting": Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test through a strong market makes any renewal assumption look good.

## 2. Choose the signals

Your strongest signal is **Expiry profile** (share of income expiring within 12 months and within 36 months). Its rule: Break options can move the real expiry earlier, so include them. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 22.6% for the seasonal baseline, a forecast value added of 46.4%. At 14 days it is 15.0% against 23.7%. The upper band covers 89.3% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 22.6% |
| Forecast value added at 7 days | 46.4% |
| 90th-percentile band coverage | 89.3% |
| Error at SKU level versus aggregate | 12.6% vs 2.5% |

## 5. An edge case from the blueprint

**Anchor tenant leaves.** The anchor tenant leaves and occupancy drops far more than the model expects. Planned response: Model anchor tenants individually and run explicit single-name scenarios. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14592 |
| `h1.wmape_model` | 0.11559 |
| `h1.wmape_baseline` | 0.21693 |
| `h1.fva` | 0.46714 |
| `h3.wmape_model` | 0.11638 |
| `h3.wmape_baseline` | 0.21262 |
| `h3.fva` | 0.45266 |
| `h7.wmape_model` | 0.12099 |
| `h7.wmape_baseline` | 0.22569 |
| `h7.fva` | 0.46391 |
| `h14.wmape_model` | 0.15001 |
| `h14.wmape_baseline` | 0.23712 |
| `h14.fva` | 0.36738 |
| `p90_coverage` | 0.89282 |
| `wmape_sku_level` | 0.12569 |
| `wmape_aggregate` | 0.025199 |
| `late_feed.missing_as_zero` | 0.18289 |
| `late_feed.missing_as_nan` | 0.13922 |

</details>
