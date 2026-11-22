# Provider Availability & Access Prediction: worked example

> Run on synthetic data with `forecast` engine, seed 28886, knobs {"n_series": 225}, in 40.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients.

**Constraints that shape the design.** Operations validates availability before it is communicated to members or patients; Observed slots and inferred estimates are always labelled separately; Forecasts state intervals and data freshness

**Label in this use case.** For "Provider Availability & Access Prediction": Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Presenting inferred waits as facts.

## 2. Choose the signals

Your strongest signal is **Open slots and booking horizon** (observed open appointments and how far ahead they are). Its rule: Schedule snapshot. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 23.5% for the seasonal baseline, a forecast value added of 48.7%. At 14 days it is 15.4% against 25.0%. The upper band covers 89.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 23.5% |
| Forecast value added at 7 days | 48.7% |
| 90th-percentile band coverage | 89.8% |
| Error at SKU level versus aggregate | 12.7% vs 2.2% |

## 5. An edge case from the blueprint

**Provider with no online schedule.** no observed slots. Planned response: Inferred estimate with a clear label. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 20423 |
| `h1.wmape_model` | 0.11834 |
| `h1.wmape_baseline` | 0.23245 |
| `h1.fva` | 0.49091 |
| `h3.wmape_model` | 0.11819 |
| `h3.wmape_baseline` | 0.22839 |
| `h3.fva` | 0.48249 |
| `h7.wmape_model` | 0.12043 |
| `h7.wmape_baseline` | 0.23458 |
| `h7.fva` | 0.48662 |
| `h14.wmape_model` | 0.15384 |
| `h14.wmape_baseline` | 0.24988 |
| `h14.fva` | 0.38434 |
| `p90_coverage` | 0.89815 |
| `wmape_sku_level` | 0.12724 |
| `wmape_aggregate` | 0.022389 |
| `late_feed.missing_as_zero` | 0.19884 |
| `late_feed.missing_as_nan` | 0.13866 |

</details>
