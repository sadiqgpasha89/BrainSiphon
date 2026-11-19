# Intraday Liquidity Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 48232, knobs {"n_series": 222}, in 10.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers.

**Constraints that shape the design.** Refresh every 15 minutes during operating hours; Never under-forecast peak outflow by more than the agreed tolerance; Fallback to historical profiles if feeds fail

**Label in this use case.** For "Intraday Liquidity Forecasting": Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on end-of-day aggregated data hides timing.

## 2. Choose the signals

Your strongest signal is **Time-of-day profile** (median cumulative flow by 15-minute slot for the same day type). Its rule: Day types must be classified using the settlement calendar. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.2% for the seasonal baseline, a forecast value added of 42.6%. At 14 days it is 14.3% against 22.3%. The upper band covers 89.1% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 42.6% |
| 90th-percentile band coverage | 89.1% |
| Error at SKU level versus aggregate | 12.4% vs 2.5% |

## 5. An edge case from the blueprint

**Settlement system outage.** flows stop and then arrive in a burst. Planned response: Outage detector that switches to scenario profiles and widens bands. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20133 |
| `h1.wmape_model` | 0.11353 |
| `h1.wmape_baseline` | 0.20485 |
| `h1.fva` | 0.44582 |
| `h3.wmape_model` | 0.11802 |
| `h3.wmape_baseline` | 0.20614 |
| `h3.fva` | 0.42746 |
| `h7.wmape_model` | 0.12142 |
| `h7.wmape_baseline` | 0.21161 |
| `h7.fva` | 0.42622 |
| `h14.wmape_model` | 0.14257 |
| `h14.wmape_baseline` | 0.22334 |
| `h14.fva` | 0.36165 |
| `p90_coverage` | 0.89117 |
| `wmape_sku_level` | 0.12363 |
| `wmape_aggregate` | 0.025296 |
| `late_feed.missing_as_zero` | 0.17541 |
| `late_feed.missing_as_nan` | 0.14155 |

</details>
