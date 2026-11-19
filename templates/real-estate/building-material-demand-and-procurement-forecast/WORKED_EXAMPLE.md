# Building Material Demand & Procurement Forecast: worked example

> Run on synthetic data with `forecast` engine, seed 28897, knobs {"n_series": 212}, in 6.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast material needs by project phase and plan purchases to avoid delays and excess stock.

**Constraints that shape the design.** Lead times of each supplier are respected in the order plan; Price volatility reflected in order timing and quantity; On-site storage limits cap early ordering

**Label in this use case.** For "Building Material Demand & Procurement Forecast": Forecast material needs by project phase and plan purchases to avoid delays and excess stock. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Plans differ from as-built quantities, so a forecast fitted to plans is biased.

## 2. Choose the signals

Your strongest signal is **Schedule phase** (tasks planned in each of the next 8 weeks mapped to material take-offs). Its rule: Schedules slip, so refresh weekly. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.2% against 23.7% for the seasonal baseline, a forecast value added of 48.5%. At 14 days it is 14.6% against 25.2%. The upper band covers 89.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.2% |
| WAPE at 7 days, seasonal baseline | 23.7% |
| Forecast value added at 7 days | 48.5% |
| 90th-percentile band coverage | 89.9% |
| Error at SKU level versus aggregate | 12.7% vs 2.6% |

## 5. An edge case from the blueprint

**Design change.** A design change alters the quantities after the plan is made. Planned response: Re-run the take-off when the design changes and update the order. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19259 |
| `h1.wmape_model` | 0.1227 |
| `h1.wmape_baseline` | 0.24207 |
| `h1.fva` | 0.49311 |
| `h3.wmape_model` | 0.11785 |
| `h3.wmape_baseline` | 0.21126 |
| `h3.fva` | 0.44214 |
| `h7.wmape_model` | 0.12212 |
| `h7.wmape_baseline` | 0.2373 |
| `h7.fva` | 0.48538 |
| `h14.wmape_model` | 0.14607 |
| `h14.wmape_baseline` | 0.25238 |
| `h14.fva` | 0.42124 |
| `p90_coverage` | 0.89916 |
| `wmape_sku_level` | 0.12708 |
| `wmape_aggregate` | 0.026321 |
| `late_feed.missing_as_zero` | 0.18247 |
| `late_feed.missing_as_nan` | 0.14168 |

</details>
