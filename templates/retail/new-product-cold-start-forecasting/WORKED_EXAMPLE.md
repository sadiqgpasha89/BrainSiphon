# New Product Cold-Start Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 86204, knobs {"n_series": 188}, in 9.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation.

**Constraints that shape the design.** Buy decisions months ahead; Small initial samples; Explainable analogue selection

**Label in this use case.** For "New Product Cold-Start Forecasting": Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Analogues drawn from future seasons.

## 2. Choose the signals

Your strongest signal is **Attribute-image embedding** (joint embedding of attributes and images). Its rule: Embeddings trained on prior seasons only. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 22.2% for the seasonal baseline, a forecast value added of 47.2%. At 14 days it is 15.1% against 23.9%. The upper band covers 88.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 22.2% |
| Forecast value added at 7 days | 47.2% |
| 90th-percentile band coverage | 88.8% |
| Error at SKU level versus aggregate | 12.6% vs 2.6% |

## 5. An edge case from the blueprint

**Viral social trend for a product.** first buy far too small. Planned response: Trend signal features and fast replenishment path. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17098 |
| `h1.wmape_model` | 0.12027 |
| `h1.wmape_baseline` | 0.21439 |
| `h1.fva` | 0.43901 |
| `h3.wmape_model` | 0.11589 |
| `h3.wmape_baseline` | 0.20098 |
| `h3.fva` | 0.4234 |
| `h7.wmape_model` | 0.11743 |
| `h7.wmape_baseline` | 0.22239 |
| `h7.fva` | 0.47196 |
| `h14.wmape_model` | 0.15124 |
| `h14.wmape_baseline` | 0.23881 |
| `h14.fva` | 0.36671 |
| `p90_coverage` | 0.88817 |
| `wmape_sku_level` | 0.126 |
| `wmape_aggregate` | 0.026431 |
| `late_feed.missing_as_zero` | 0.1891 |
| `late_feed.missing_as_nan` | 0.13394 |

</details>
