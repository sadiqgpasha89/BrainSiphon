# Fresh Produce Waste & Order Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 40899, knobs {"n_series": 152}, in 7.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target.

**Constraints that shape the design.** Shelf-life windows; Supplier delivery cut-offs; Markdown rules

**Label in this use case.** For "Fresh Produce Waste & Order Forecasting": Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtest ignores shelf-life state.

## 2. Choose the signals

Your strongest signal is **Stock-by-age vector** (units by remaining shelf life). Its rule: Snapshot at order time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.4% against 21.2% for the seasonal baseline, a forecast value added of 41.6%. At 14 days it is 15.1% against 22.7%. The upper band covers 89.3% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.4% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 41.6% |
| 90th-percentile band coverage | 89.3% |
| Error at SKU level versus aggregate | 12.6% vs 2.2% |

## 5. An edge case from the blueprint

**Supplier delivers poorer shelf life.** produce arrives with less remaining life and spoils before the forecast sell-through. Planned response: Receipt-quality capture and supplier scorecard. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13779 |
| `h1.wmape_model` | 0.11703 |
| `h1.wmape_baseline` | 0.21049 |
| `h1.fva` | 0.44399 |
| `h3.wmape_model` | 0.11566 |
| `h3.wmape_baseline` | 0.20159 |
| `h3.fva` | 0.42627 |
| `h7.wmape_model` | 0.12381 |
| `h7.wmape_baseline` | 0.21209 |
| `h7.fva` | 0.41626 |
| `h14.wmape_model` | 0.15099 |
| `h14.wmape_baseline` | 0.22682 |
| `h14.fva` | 0.33433 |
| `p90_coverage` | 0.89266 |
| `wmape_sku_level` | 0.12622 |
| `wmape_aggregate` | 0.022172 |
| `late_feed.missing_as_zero` | 0.19881 |
| `late_feed.missing_as_nan` | 0.14445 |

</details>
