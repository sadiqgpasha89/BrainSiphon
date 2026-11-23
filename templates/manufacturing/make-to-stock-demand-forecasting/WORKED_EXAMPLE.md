# Demand Forecasting for Make-to-Stock Items: worked example

> Run on synthetic data with `forecast` engine, seed 6957, knobs {"n_series": 206}, in 19.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand.

**Constraints that shape the design.** Forecast per item and channel for 26 weeks; Quantile output for safety stock; Promotion and event inputs

**Label in this use case.** For "Demand Forecasting for Make-to-Stock Items": Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using shipments as demand.

## 2. Choose the signals

Your strongest signal is **Same week last year** (demand in the matching week of prior years). Its rule: Aligned by week number. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.9% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 23.6% for the seasonal baseline, a forecast value added of 49.0%. At 14 days it is 15.7% against 25.1%. The upper band covers 89.6% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 23.6% |
| Forecast value added at 7 days | 49.0% |
| 90th-percentile band coverage | 89.6% |
| Error at SKU level versus aggregate | 12.7% vs 2.9% |

## 5. An edge case from the blueprint

**New item.** the item has no sales history. Planned response: Borrow from similar items and widen the interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18744 |
| `h1.wmape_model` | 0.11586 |
| `h1.wmape_baseline` | 0.20723 |
| `h1.fva` | 0.44093 |
| `h3.wmape_model` | 0.11654 |
| `h3.wmape_baseline` | 0.21164 |
| `h3.fva` | 0.44933 |
| `h7.wmape_model` | 0.12037 |
| `h7.wmape_baseline` | 0.23589 |
| `h7.fva` | 0.48971 |
| `h14.wmape_model` | 0.15736 |
| `h14.wmape_baseline` | 0.25116 |
| `h14.fva` | 0.37348 |
| `p90_coverage` | 0.89565 |
| `wmape_sku_level` | 0.12683 |
| `wmape_aggregate` | 0.029034 |
| `late_feed.missing_as_zero` | 0.18925 |
| `late_feed.missing_as_nan` | 0.1411 |

</details>
