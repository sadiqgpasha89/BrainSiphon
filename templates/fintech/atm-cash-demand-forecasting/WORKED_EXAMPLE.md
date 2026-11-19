# ATM Cash Demand Forecasting & Replenishment: worked example

> Run on synthetic data with `forecast` engine, seed 88102, knobs {"n_series": 158}, in 6.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits.

**Constraints that shape the design.** Replenishment cost per visit; Cash-out SLA; 100k ATMs daily

**Label in this use case.** For "ATM Cash Demand Forecasting & Replenishment": Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating censored days as true demand.

## 2. Choose the signals

Your strongest signal is **Payday proximity** (days to local salary dates). Its rule: Region-specific calendars. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.7% against 22.4% for the seasonal baseline, a forecast value added of 47.5%. At 14 days it is 14.9% against 23.8%. The upper band covers 89.0% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.7% |
| WAPE at 7 days, seasonal baseline | 22.4% |
| Forecast value added at 7 days | 47.5% |
| 90th-percentile band coverage | 89.0% |
| Error at SKU level versus aggregate | 12.5% vs 2.6% |

## 5. An edge case from the blueprint

**Local event (festival) drives demand.** machines run out of cash during the event. Planned response: Event calendar features and manual override channel. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14262 |
| `h1.wmape_model` | 0.11952 |
| `h1.wmape_baseline` | 0.22398 |
| `h1.fva` | 0.46639 |
| `h3.wmape_model` | 0.1182 |
| `h3.wmape_baseline` | 0.21128 |
| `h3.fva` | 0.44057 |
| `h7.wmape_model` | 0.11738 |
| `h7.wmape_baseline` | 0.22364 |
| `h7.fva` | 0.47514 |
| `h14.wmape_model` | 0.14857 |
| `h14.wmape_baseline` | 0.23819 |
| `h14.fva` | 0.37624 |
| `p90_coverage` | 0.89013 |
| `wmape_sku_level` | 0.12547 |
| `wmape_aggregate` | 0.02631 |
| `late_feed.missing_as_zero` | 0.18002 |
| `late_feed.missing_as_nan` | 0.13601 |

</details>
