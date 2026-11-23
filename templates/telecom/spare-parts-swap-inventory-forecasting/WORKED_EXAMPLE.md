# Spare Parts & Swap Inventory Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 52947, knobs {"n_series": 168}, in 16.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall.

**Constraints that shape the design.** Forecast by part and depot with intervals; Lead times included; Obsolete parts flagged

**Label in this use case.** For "Spare Parts & Swap Inventory Forecasting": Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed lead times.

## 2. Choose the signals

Your strongest signal is **Installed base by age** (count of units by age band). Its rule: From asset records. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.4% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 11.9% against 21.2% for the seasonal baseline, a forecast value added of 43.8%. At 14 days it is 14.6% against 22.4%. The upper band covers 89.5% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 11.9% |
| WAPE at 7 days, seasonal baseline | 21.2% |
| Forecast value added at 7 days | 43.8% |
| 90th-percentile band coverage | 89.5% |
| Error at SKU level versus aggregate | 12.4% vs 2.3% |

## 5. An edge case from the blueprint

**New part.** the new part has no usage history. Planned response: Use similar parts and rollout data. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 15269 |
| `h1.wmape_model` | 0.12042 |
| `h1.wmape_baseline` | 0.23014 |
| `h1.fva` | 0.47674 |
| `h3.wmape_model` | 0.11116 |
| `h3.wmape_baseline` | 0.21224 |
| `h3.fva` | 0.47628 |
| `h7.wmape_model` | 0.11903 |
| `h7.wmape_baseline` | 0.21182 |
| `h7.fva` | 0.43808 |
| `h14.wmape_model` | 0.14579 |
| `h14.wmape_baseline` | 0.22412 |
| `h14.fva` | 0.34951 |
| `p90_coverage` | 0.89462 |
| `wmape_sku_level` | 0.12367 |
| `wmape_aggregate` | 0.022606 |
| `late_feed.missing_as_zero` | 0.20464 |
| `late_feed.missing_as_nan` | 0.13962 |

</details>
