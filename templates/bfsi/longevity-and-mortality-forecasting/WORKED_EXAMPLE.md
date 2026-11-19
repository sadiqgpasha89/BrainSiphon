# Longevity & Mortality Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 6353, knobs {"n_series": 272}, in 11.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.

**Constraints that shape the design.** Methods and assumptions align with actuarial standards for reserving and pricing; Every forecast is shown with uncertainty bands; Assumptions refreshed once a year with a documented change log

**Label in this use case.** For "Longevity & Mortality Forecasting": Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test through stable years makes any trend model look accurate.

## 2. Choose the signals

Your strongest signal is **Age-period-cohort effects** (decomposition of log mortality into age, period and cohort terms). Its rule: The three effects are not fully identifiable, so impose a documented constraint. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.8% against 20.5% for the seasonal baseline, a forecast value added of 42.2%. At 14 days it is 14.3% against 21.9%. The upper band covers 88.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.8% |
| WAPE at 7 days, seasonal baseline | 20.5% |
| Forecast value added at 7 days | 42.2% |
| 90th-percentile band coverage | 88.7% |
| Error at SKU level versus aggregate | 12.4% vs 2.5% |

## 5. An edge case from the blueprint

**Pandemic years.** Excess deaths in pandemic years distort the trend. Planned response: Exclude those years or add dummy period effects and document the choice. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 24660 |
| `h1.wmape_model` | 0.11711 |
| `h1.wmape_baseline` | 0.20534 |
| `h1.fva` | 0.4297 |
| `h3.wmape_model` | 0.11665 |
| `h3.wmape_baseline` | 0.20424 |
| `h3.fva` | 0.42886 |
| `h7.wmape_model` | 0.11843 |
| `h7.wmape_baseline` | 0.20488 |
| `h7.fva` | 0.42194 |
| `h14.wmape_model` | 0.14338 |
| `h14.wmape_baseline` | 0.21916 |
| `h14.fva` | 0.34577 |
| `p90_coverage` | 0.88686 |
| `wmape_sku_level` | 0.12356 |
| `wmape_aggregate` | 0.024858 |
| `late_feed.missing_as_zero` | 0.19192 |
| `late_feed.missing_as_nan` | 0.14196 |

</details>
