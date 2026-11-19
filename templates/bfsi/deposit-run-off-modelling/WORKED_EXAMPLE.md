# Deposit Run-Off Modelling: worked example

> Run on synthetic data with `forecast` engine, seed 50328, knobs {"n_series": 268}, in 13.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence.

**Constraints that shape the design.** Regulatory liquidity coverage assumptions as bounds; Model validated annually; Stable and non-stable splits explainable

**Label in this use case.** For "Deposit Run-Off Modelling": Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on a rate-stable era understates sensitivity.

## 2. Choose the signals

Your strongest signal is **Rate gap** (own deposit rate minus the best competitor rate for the segment). Its rule: Competitor rates are collected irregularly. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.5% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.0% against 22.7% for the seasonal baseline, a forecast value added of 47.3%. At 14 days it is 15.0% against 24.4%. The upper band covers 89.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.0% |
| WAPE at 7 days, seasonal baseline | 22.7% |
| Forecast value added at 7 days | 47.3% |
| 90th-percentile band coverage | 89.9% |
| Error at SKU level versus aggregate | 12.6% vs 2.5% |

## 5. An edge case from the blueprint

**Social-media-driven bank run.** outflows far exceed history. Planned response: Tail scenarios with speed assumptions and intraday triggers. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 24420 |
| `h1.wmape_model` | 0.1185 |
| `h1.wmape_baseline` | 0.22713 |
| `h1.fva` | 0.47825 |
| `h3.wmape_model` | 0.11617 |
| `h3.wmape_baseline` | 0.21344 |
| `h3.fva` | 0.45571 |
| `h7.wmape_model` | 0.11981 |
| `h7.wmape_baseline` | 0.22724 |
| `h7.fva` | 0.47274 |
| `h14.wmape_model` | 0.14963 |
| `h14.wmape_baseline` | 0.24381 |
| `h14.fva` | 0.38627 |
| `p90_coverage` | 0.89947 |
| `wmape_sku_level` | 0.12583 |
| `wmape_aggregate` | 0.025388 |
| `late_feed.missing_as_zero` | 0.19336 |
| `late_feed.missing_as_nan` | 0.13859 |

</details>
