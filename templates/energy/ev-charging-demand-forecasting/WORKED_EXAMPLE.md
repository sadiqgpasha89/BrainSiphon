# EV Charging Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 89143, knobs {"n_series": 188}, in 19.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge.

**Constraints that shape the design.** 15-minute resolution for 14 days; Aggregated demand by site and feeder; No tracking of individual drivers

**Label in this use case.** For "EV Charging Demand Forecasting": Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual trip tracking.

## 2. Choose the signals

Your strongest signal is **Site type and location** (workplace, public or home area). Its rule: From the register. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 20.7% for the seasonal baseline, a forecast value added of 42.5%. At 14 days it is 14.6% against 22.2%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 20.7% |
| Forecast value added at 7 days | 42.5% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.5% vs 2.5% |

## 5. An edge case from the blueprint

**New site.** the site has no charging history. Planned response: Borrow from similar sites with a wide interval. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17037 |
| `h1.wmape_model` | 0.11611 |
| `h1.wmape_baseline` | 0.20954 |
| `h1.fva` | 0.44589 |
| `h3.wmape_model` | 0.11941 |
| `h3.wmape_baseline` | 0.19856 |
| `h3.fva` | 0.39863 |
| `h7.wmape_model` | 0.1191 |
| `h7.wmape_baseline` | 0.20708 |
| `h7.fva` | 0.42485 |
| `h14.wmape_model` | 0.14645 |
| `h14.wmape_baseline` | 0.22234 |
| `h14.fva` | 0.34133 |
| `p90_coverage` | 0.89452 |
| `wmape_sku_level` | 0.12475 |
| `wmape_aggregate` | 0.025101 |
| `late_feed.missing_as_zero` | 0.19171 |
| `late_feed.missing_as_nan` | 0.14436 |

</details>
