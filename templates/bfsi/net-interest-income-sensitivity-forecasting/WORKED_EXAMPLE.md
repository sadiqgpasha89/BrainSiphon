# Net Interest Income Sensitivity Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 51636, knobs {"n_series": 188}, in 8.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits.

**Constraints that shape the design.** Monthly ALCO pack; Scenarios from the ALM policy; Reconcile to finance within 1%

**Label in this use case.** For "Net Interest Income Sensitivity Forecasting": Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training in a falling-rate era understates deposit beta.

## 2. Choose the signals

Your strongest signal is **Deposit beta by product** (change in own rate per unit change in the policy rate). Its rule: Beta is non-linear and lagged. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 3.0% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.2% against 20.5% for the seasonal baseline, a forecast value added of 40.7%. At 14 days it is 15.4% against 22.1%. The upper band covers 89.1% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.2% |
| WAPE at 7 days, seasonal baseline | 20.5% |
| Forecast value added at 7 days | 40.7% |
| 90th-percentile band coverage | 89.1% |
| Error at SKU level versus aggregate | 12.6% vs 3.0% |

## 5. An edge case from the blueprint

**Negative rate regime.** Behavioural assumptions such as deposit pass-through break when rates go below zero. Planned response: Apply floors in the behaviour models and a regime flag that moves the forecast to a stress mode. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 17029 |
| `h1.wmape_model` | 0.11528 |
| `h1.wmape_baseline` | 0.20115 |
| `h1.fva` | 0.42691 |
| `h3.wmape_model` | 0.11664 |
| `h3.wmape_baseline` | 0.20974 |
| `h3.fva` | 0.44386 |
| `h7.wmape_model` | 0.12172 |
| `h7.wmape_baseline` | 0.20514 |
| `h7.fva` | 0.40665 |
| `h14.wmape_model` | 0.15379 |
| `h14.wmape_baseline` | 0.22093 |
| `h14.fva` | 0.30388 |
| `p90_coverage` | 0.89089 |
| `wmape_sku_level` | 0.12629 |
| `wmape_aggregate` | 0.030179 |
| `late_feed.missing_as_zero` | 0.23475 |
| `late_feed.missing_as_nan` | 0.14665 |

</details>
