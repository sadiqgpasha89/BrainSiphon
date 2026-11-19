# Hospital Supply & Consumables Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 87428, knobs {"n_series": 288}, in 14.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste.

**Constraints that shape the design.** Critical item service levels; Expiry dates; Delivery lead times

**Label in this use case.** For "Hospital Supply & Consumables Forecasting": Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Censored demand during stock-outs.

## 2. Choose the signals

Your strongest signal is **Procedure schedule** (upcoming surgeries by type). Its rule: Schedule as-of. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.7% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.9% for the seasonal baseline, a forecast value added of 45.7%. At 14 days it is 14.7% against 23.2%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.9% |
| Forecast value added at 7 days | 45.7% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.5% vs 2.7% |

## 5. An edge case from the blueprint

**Supplier recall.** sudden shortage. Planned response: Recall feed and alternate-product mapping. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 26091 |
| `h1.wmape_model` | 0.11705 |
| `h1.wmape_baseline` | 0.22579 |
| `h1.fva` | 0.48162 |
| `h3.wmape_model` | 0.11719 |
| `h3.wmape_baseline` | 0.21531 |
| `h3.fva` | 0.45574 |
| `h7.wmape_model` | 0.11908 |
| `h7.wmape_baseline` | 0.21923 |
| `h7.fva` | 0.45684 |
| `h14.wmape_model` | 0.14728 |
| `h14.wmape_baseline` | 0.23199 |
| `h14.fva` | 0.36517 |
| `p90_coverage` | 0.89452 |
| `wmape_sku_level` | 0.12483 |
| `wmape_aggregate` | 0.026855 |
| `late_feed.missing_as_zero` | 0.1963 |
| `late_feed.missing_as_nan` | 0.13914 |

</details>
