# Mutual Fund Flow Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 83746, knobs {"n_series": 238}, in 15.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity.

**Constraints that shape the design.** Forecast by 06:00; Intervals required; Explainable drivers

**Label in this use case.** For "Mutual Fund Flow Forecasting": Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final data instead of as-known data.

## 2. Choose the signals

Your strongest signal is **Day-of-month profile** (median flow by day type). Its rule: Calendar shifts. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.3% on the aggregate but 12.7% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.3% against 22.4% for the seasonal baseline, a forecast value added of 45.4%. At 14 days it is 14.9% against 23.8%. The upper band covers 89.9% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.3% |
| WAPE at 7 days, seasonal baseline | 22.4% |
| Forecast value added at 7 days | 45.4% |
| 90th-percentile band coverage | 89.9% |
| Error at SKU level versus aggregate | 12.7% vs 2.3% |

## 5. An edge case from the blueprint

**Large institutional redemption.** One investor redeems a large amount and the forecast is dominated by a single event. Planned response: Flag concentrated holders and take their intentions as manual inputs. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 21590 |
| `h1.wmape_model` | 0.12132 |
| `h1.wmape_baseline` | 0.22191 |
| `h1.fva` | 0.45328 |
| `h3.wmape_model` | 0.11807 |
| `h3.wmape_baseline` | 0.22393 |
| `h3.fva` | 0.47272 |
| `h7.wmape_model` | 0.12252 |
| `h7.wmape_baseline` | 0.22435 |
| `h7.fva` | 0.45392 |
| `h14.wmape_model` | 0.14898 |
| `h14.wmape_baseline` | 0.23757 |
| `h14.fva` | 0.37289 |
| `p90_coverage` | 0.89884 |
| `wmape_sku_level` | 0.12732 |
| `wmape_aggregate` | 0.023142 |
| `late_feed.missing_as_zero` | 0.19148 |
| `late_feed.missing_as_nan` | 0.14344 |

</details>
