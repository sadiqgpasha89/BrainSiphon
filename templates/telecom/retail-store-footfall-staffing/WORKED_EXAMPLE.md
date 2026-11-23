# Retail Store Footfall & Staffing: worked example

> Run on synthetic data with `forecast` engine, seed 13511, knobs {"n_series": 212}, in 21.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget.

**Constraints that shape the design.** Forecast per store per hour for 14 days; Rostering rules and labour law respected; Planner can override

**Label in this use case.** For "Retail Store Footfall & Staffing": Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using sales as demand.

## 2. Choose the signals

Your strongest signal is **Same hour last week** (footfall in the same hour in recent weeks). Its rule: Local time. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.2% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.0% for the seasonal baseline, a forecast value added of 43.1%. At 14 days it is 14.6% against 22.8%. The upper band covers 88.2% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.0% |
| Forecast value added at 7 days | 43.1% |
| 90th-percentile band coverage | 88.2% |
| Error at SKU level versus aggregate | 12.5% vs 3.2% |

## 5. An edge case from the blueprint

**New store.** the new store has no history yet. Planned response: Borrow a profile from similar stores. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19276 |
| `h1.wmape_model` | 0.11641 |
| `h1.wmape_baseline` | 0.21839 |
| `h1.fva` | 0.46695 |
| `h3.wmape_model` | 0.11986 |
| `h3.wmape_baseline` | 0.2291 |
| `h3.fva` | 0.47679 |
| `h7.wmape_model` | 0.11934 |
| `h7.wmape_baseline` | 0.20977 |
| `h7.fva` | 0.43111 |
| `h14.wmape_model` | 0.14615 |
| `h14.wmape_baseline` | 0.22801 |
| `h14.fva` | 0.35901 |
| `p90_coverage` | 0.88182 |
| `wmape_sku_level` | 0.12511 |
| `wmape_aggregate` | 0.031903 |
| `late_feed.missing_as_zero` | 0.19173 |
| `late_feed.missing_as_nan` | 0.13733 |

</details>
