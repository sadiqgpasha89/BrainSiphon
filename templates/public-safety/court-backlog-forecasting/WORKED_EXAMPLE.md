# Court Backlog Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 72062, knobs {"n_series": 296}, in 27.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand.

**Constraints that shape the design.** Monthly forecast for 24 months; Scenarios for new rules and resources; Aggregated case counts only

**Label in this use case.** For "Court Backlog Forecasting": Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backlog counts only.

## 2. Choose the signals

Your strongest signal is **Filing counts by type** (monthly new cases). Its rule: From the case system. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.0% on the aggregate but 12.9% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.2% against 23.2% for the seasonal baseline, a forecast value added of 47.3%. At 14 days it is 15.0% against 25.3%. The upper band covers 89.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.2% |
| WAPE at 7 days, seasonal baseline | 23.2% |
| Forecast value added at 7 days | 47.3% |
| 90th-percentile band coverage | 89.7% |
| Error at SKU level versus aggregate | 12.9% vs 3.0% |

## 5. An edge case from the blueprint

**Law change.** new offences create filings. Planned response: Policy scenario inputs. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 26854 |
| `h1.wmape_model` | 0.11941 |
| `h1.wmape_baseline` | 0.21907 |
| `h1.fva` | 0.45493 |
| `h3.wmape_model` | 0.1244 |
| `h3.wmape_baseline` | 0.24686 |
| `h3.fva` | 0.49608 |
| `h7.wmape_model` | 0.12221 |
| `h7.wmape_baseline` | 0.23169 |
| `h7.fva` | 0.47251 |
| `h14.wmape_model` | 0.14963 |
| `h14.wmape_baseline` | 0.25308 |
| `h14.fva` | 0.40877 |
| `p90_coverage` | 0.89651 |
| `wmape_sku_level` | 0.12865 |
| `wmape_aggregate` | 0.030067 |
| `late_feed.missing_as_zero` | 0.18628 |
| `late_feed.missing_as_nan` | 0.14748 |

</details>
