# House Price Index & Market Trend Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 6526, knobs {"n_series": 189}, in 7.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.

**Constraints that shape the design.** Published on a fixed monthly date with the revision policy stated up front; Every figure shown with a prediction interval, never a bare number; Methodology reproducible from the same inputs by an outside analyst

**Label in this use case.** For "House Price Index & Market Trend Forecasting": Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test run only through a rising market flatters any model that predicts continued growth.

## 2. Choose the signals

Your strongest signal is **Repeat-sales pairs** (log price change between two sales of the same property divided by the years between them). Its rule: Few pairs exist in thin markets, so pool by region and report the count. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.7% on the aggregate but 12.8% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.5% against 23.5% for the seasonal baseline, a forecast value added of 46.8%. At 14 days it is 15.6% against 25.3%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.5% |
| WAPE at 7 days, seasonal baseline | 23.5% |
| Forecast value added at 7 days | 46.8% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.8% vs 2.7% |

## 5. An edge case from the blueprint

**Revisions.** Late sales change earlier index values. Planned response: Track revisions and publish with a revision note. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17132 |
| `h1.wmape_model` | 0.11847 |
| `h1.wmape_baseline` | 0.22488 |
| `h1.fva` | 0.47318 |
| `h3.wmape_model` | 0.11583 |
| `h3.wmape_baseline` | 0.20404 |
| `h3.fva` | 0.43235 |
| `h7.wmape_model` | 0.12533 |
| `h7.wmape_baseline` | 0.23542 |
| `h7.fva` | 0.46765 |
| `h14.wmape_model` | 0.15569 |
| `h14.wmape_baseline` | 0.25261 |
| `h14.fva` | 0.38366 |
| `p90_coverage` | 0.8947 |
| `wmape_sku_level` | 0.12804 |
| `wmape_aggregate` | 0.027233 |
| `late_feed.missing_as_zero` | 0.1807 |
| `late_feed.missing_as_nan` | 0.14225 |

</details>
