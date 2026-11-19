# Procurement Price & Commodity Cost Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 56239, knobs {"n_series": 281}, in 11.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations.

**Constraints that shape the design.** Regime changes; Few observations for custom parts; Scenario support

**Label in this use case.** For "Procurement Price & Commodity Cost Forecasting": Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using revised index values in training.

## 2. Choose the signals

Your strongest signal is **Index price lag features** (commodity index lags). Its rule: Publication timing. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.9% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.7% for the seasonal baseline, a forecast value added of 44.0%. At 14 days it is 14.6% against 23.4%. The upper band covers 89.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.7% |
| Forecast value added at 7 days | 44.0% |
| 90th-percentile band coverage | 89.9% |
| Error at SKU level versus aggregate | 12.5% vs 2.9% |

## 5. An edge case from the blueprint

**Supply shock (war, embargo).** historical relationships break. Planned response: Regime detection and scenario overlays. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25556 |
| `h1.wmape_model` | 0.11977 |
| `h1.wmape_baseline` | 0.23769 |
| `h1.fva` | 0.49611 |
| `h3.wmape_model` | 0.11633 |
| `h3.wmape_baseline` | 0.22184 |
| `h3.fva` | 0.47561 |
| `h7.wmape_model` | 0.12133 |
| `h7.wmape_baseline` | 0.21652 |
| `h7.fva` | 0.43964 |
| `h14.wmape_model` | 0.14645 |
| `h14.wmape_baseline` | 0.2341 |
| `h14.fva` | 0.37441 |
| `p90_coverage` | 0.89905 |
| `wmape_sku_level` | 0.12546 |
| `wmape_aggregate` | 0.028604 |
| `late_feed.missing_as_zero` | 0.1953 |
| `late_feed.missing_as_nan` | 0.13768 |

</details>
