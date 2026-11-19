# Warehouse Labour Demand Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 45924, knobs {"n_series": 240}, in 7.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime.

**Constraints that shape the design.** Shift notice rules; Skill mix; Peak season variability

**Label in this use case.** For "Warehouse Labour Demand Forecasting": Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Forecasting hours that were constrained by staffing.

## 2. Choose the signals

Your strongest signal is **Forecast order lines by type** (lines by category). Its rule: Forecast. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.8% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.2% against 20.8% for the seasonal baseline, a forecast value added of 41.3%. At 14 days it is 15.0% against 22.4%. The upper band covers 88.4% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.2% |
| WAPE at 7 days, seasonal baseline | 20.8% |
| Forecast value added at 7 days | 41.3% |
| 90th-percentile band coverage | 88.4% |
| Error at SKU level versus aggregate | 12.6% vs 2.8% |

## 5. An edge case from the blueprint

**New automation reduces labour needs.** model overestimates. Planned response: Change-point detection and process-version flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21746 |
| `h1.wmape_model` | 0.11742 |
| `h1.wmape_baseline` | 0.22536 |
| `h1.fva` | 0.47896 |
| `h3.wmape_model` | 0.11779 |
| `h3.wmape_baseline` | 0.22354 |
| `h3.fva` | 0.47306 |
| `h7.wmape_model` | 0.12215 |
| `h7.wmape_baseline` | 0.20793 |
| `h7.fva` | 0.41254 |
| `h14.wmape_model` | 0.1504 |
| `h14.wmape_baseline` | 0.22369 |
| `h14.fva` | 0.32766 |
| `p90_coverage` | 0.88407 |
| `wmape_sku_level` | 0.12616 |
| `wmape_aggregate` | 0.028414 |
| `late_feed.missing_as_zero` | 0.19365 |
| `late_feed.missing_as_nan` | 0.14285 |

</details>
