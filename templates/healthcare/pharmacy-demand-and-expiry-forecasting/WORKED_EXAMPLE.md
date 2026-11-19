# Pharmacy Demand & Expiry Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 9401, knobs {"n_series": 283}, in 17.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items.

**Constraints that shape the design.** Controlled substances rules; Cold-chain handling; Expiry date tracking

**Label in this use case.** For "Pharmacy Demand & Expiry Forecasting": Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtests ignoring shortage events.

## 2. Choose the signals

Your strongest signal is **Prescription trend signals** (new prescriptions and refills). Its rule: Rx data lag. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.2% on the aggregate but 12.5% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.8% against 21.7% for the seasonal baseline, a forecast value added of 45.8%. At 14 days it is 15.0% against 23.3%. The upper band covers 89.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.8% |
| WAPE at 7 days, seasonal baseline | 21.7% |
| Forecast value added at 7 days | 45.8% |
| 90th-percentile band coverage | 89.8% |
| Error at SKU level versus aggregate | 12.5% vs 2.2% |

## 5. An edge case from the blueprint

**Drug shortage announced.** demand shifts to substitute. Planned response: Substitution matrix updates by shortage events. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 25765 |
| `h1.wmape_model` | 0.11842 |
| `h1.wmape_baseline` | 0.21411 |
| `h1.fva` | 0.4469 |
| `h3.wmape_model` | 0.11578 |
| `h3.wmape_baseline` | 0.19803 |
| `h3.fva` | 0.41535 |
| `h7.wmape_model` | 0.11755 |
| `h7.wmape_baseline` | 0.21683 |
| `h7.fva` | 0.45787 |
| `h14.wmape_model` | 0.14991 |
| `h14.wmape_baseline` | 0.23277 |
| `h14.fva` | 0.35596 |
| `p90_coverage` | 0.89769 |
| `wmape_sku_level` | 0.12522 |
| `wmape_aggregate` | 0.022242 |
| `late_feed.missing_as_zero` | 0.20124 |
| `late_feed.missing_as_nan` | 0.13938 |

</details>
