# Delivery Promise (ETA) Estimation: worked example

> Run on synthetic data with `forecast` engine, seed 38474, knobs {"n_series": 256}, in 8.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability.

**Constraints that shape the design.** 40 ms per promise; Late delivery penalty; Carrier capacity constraints

**Label in this use case.** For "Delivery Promise (ETA) Estimation": Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on delivered orders only (survivorship).

## 2. Choose the signals

Your strongest signal is **Pin-code carrier lead-time quantile** (90th percentile of last-mile time by carrier and pin). Its rule: Recent window as-of. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 1.7% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.5% against 21.4% for the seasonal baseline, a forecast value added of 46.0%. At 14 days it is 14.3% against 23.3%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.5% |
| WAPE at 7 days, seasonal baseline | 21.4% |
| Forecast value added at 7 days | 46.0% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.4% vs 1.7% |

## 5. An edge case from the blueprint

**Festive-season carrier delays.** promises miss widely. Planned response: Dynamic buffer from live on-time rate. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 23261 |
| `h1.wmape_model` | 0.12071 |
| `h1.wmape_baseline` | 0.21935 |
| `h1.fva` | 0.44971 |
| `h3.wmape_model` | 0.11766 |
| `h3.wmape_baseline` | 0.22507 |
| `h3.fva` | 0.47721 |
| `h7.wmape_model` | 0.1153 |
| `h7.wmape_baseline` | 0.21368 |
| `h7.fva` | 0.46044 |
| `h14.wmape_model` | 0.14337 |
| `h14.wmape_baseline` | 0.23316 |
| `h14.fva` | 0.38511 |
| `p90_coverage` | 0.8954 |
| `wmape_sku_level` | 0.12395 |
| `wmape_aggregate` | 0.017373 |
| `late_feed.missing_as_zero` | 0.20788 |
| `late_feed.missing_as_nan` | 0.13778 |

</details>
