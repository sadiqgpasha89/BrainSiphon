# Traffic Flow Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 24113, knobs {"n_series": 204}, in 20.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion.

**Constraints that shape the design.** 5-minute resolution up to 2 hours with hourly values up to 24 hours; Aggregated and anonymised data only; Intervals reported

**Label in this use case.** For "Traffic Flow Forecasting": Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Independent link models.

## 2. Choose the signals

Your strongest signal is **Upstream flow and speed** (conditions on neighbouring links). Its rule: From the graph. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 20.8% for the seasonal baseline, a forecast value added of 42.7%. At 14 days it is 14.5% against 22.0%. The upper band covers 89.2% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 20.8% |
| Forecast value added at 7 days | 42.7% |
| 90th-percentile band coverage | 89.2% |
| Error at SKU level versus aggregate | 12.4% vs 2.6% |

## 5. An edge case from the blueprint

**Detector outage.** data for a corridor is missing. Planned response: Imputation limits and a flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 18567 |
| `h1.wmape_model` | 0.11509 |
| `h1.wmape_baseline` | 0.20098 |
| `h1.fva` | 0.42736 |
| `h3.wmape_model` | 0.12001 |
| `h3.wmape_baseline` | 0.21957 |
| `h3.fva` | 0.45341 |
| `h7.wmape_model` | 0.11912 |
| `h7.wmape_baseline` | 0.20779 |
| `h7.fva` | 0.42676 |
| `h14.wmape_model` | 0.14538 |
| `h14.wmape_baseline` | 0.22046 |
| `h14.fva` | 0.34055 |
| `p90_coverage` | 0.89207 |
| `wmape_sku_level` | 0.12439 |
| `wmape_aggregate` | 0.026118 |
| `late_feed.missing_as_zero` | 0.18263 |
| `late_feed.missing_as_nan` | 0.13929 |

</details>
