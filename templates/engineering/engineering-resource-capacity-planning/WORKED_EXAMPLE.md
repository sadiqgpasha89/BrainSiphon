# Engineering Resource Capacity Planning: worked example

> Run on synthetic data with `forecast` engine, seed 84919, knobs {"n_series": 250}, in 23.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level.

**Constraints that shape the design.** Planning at skill and team level; No individual utilisation ranking; Managers decide on hiring and assignments

**Label in this use case.** For "Engineering Resource Capacity Planning": Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual utilisation ranking.

## 2. Choose the signals

Your strongest signal is **Project pipeline and stage** (likely work and timing). Its rule: From the pipeline. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.6% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 21.8% for the seasonal baseline, a forecast value added of 44.4%. At 14 days it is 14.8% against 23.5%. The upper band covers 88.7% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 21.8% |
| Forecast value added at 7 days | 44.4% |
| 90th-percentile band coverage | 88.7% |
| Error at SKU level versus aggregate | 12.5% vs 2.6% |

## 5. An edge case from the blueprint

**Win rate shift.** the pipeline converts differently. Planned response: Updating conversion rates. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 22721 |
| `h1.wmape_model` | 0.11731 |
| `h1.wmape_baseline` | 0.2205 |
| `h1.fva` | 0.46798 |
| `h3.wmape_model` | 0.11431 |
| `h3.wmape_baseline` | 0.20817 |
| `h3.fva` | 0.45089 |
| `h7.wmape_model` | 0.12131 |
| `h7.wmape_baseline` | 0.21799 |
| `h7.fva` | 0.44352 |
| `h14.wmape_model` | 0.14835 |
| `h14.wmape_baseline` | 0.23505 |
| `h14.fva` | 0.36888 |
| `p90_coverage` | 0.88702 |
| `wmape_sku_level` | 0.12476 |
| `wmape_aggregate` | 0.026191 |
| `late_feed.missing_as_zero` | 0.17952 |
| `late_feed.missing_as_nan` | 0.13778 |

</details>
