# Cell-Level Traffic Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 70143, knobs {"n_series": 279}, in 26.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast traffic and user counts per cell for hours to weeks ahead so capacity, energy and maintenance plans use realistic demand with uncertainty.

**Constraints that shape the design.** Quantile forecasts for 200K cells; Forecast refreshed every hour for the next 7 days; Special events handled from a calendar

**Label in this use case.** For "Cell-Level Traffic Forecasting": Forecast traffic and user counts per cell for hours to weeks ahead so capacity, energy and maintenance plans use realistic demand with uncertainty. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on saturated throughput as demand.

## 2. Choose the signals

Your strongest signal is **Same hour last week** (traffic at the same hour in the previous weeks). Its rule: Align on local time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.4% on the aggregate but 12.3% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 20.4% for the seasonal baseline, a forecast value added of 42.8%. At 14 days it is 14.4% against 22.0%. The upper band covers 89.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 20.4% |
| Forecast value added at 7 days | 42.8% |
| 90th-percentile band coverage | 89.4% |
| Error at SKU level versus aggregate | 12.3% vs 2.4% |

## 5. An edge case from the blueprint

**New cell.** the cell has no traffic history. Planned response: Borrow a profile from similar cells and widen the interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25423 |
| `h1.wmape_model` | 0.11658 |
| `h1.wmape_baseline` | 0.20939 |
| `h1.fva` | 0.44323 |
| `h3.wmape_model` | 0.11712 |
| `h3.wmape_baseline` | 0.20929 |
| `h3.fva` | 0.44038 |
| `h7.wmape_model` | 0.11676 |
| `h7.wmape_baseline` | 0.20398 |
| `h7.fva` | 0.42759 |
| `h14.wmape_model` | 0.14389 |
| `h14.wmape_baseline` | 0.21988 |
| `h14.fva` | 0.3456 |
| `p90_coverage` | 0.89423 |
| `wmape_sku_level` | 0.12322 |
| `wmape_aggregate` | 0.023643 |
| `late_feed.missing_as_zero` | 0.17445 |
| `late_feed.missing_as_nan` | 0.13804 |

</details>
