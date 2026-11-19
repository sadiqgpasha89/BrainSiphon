# Short-Term Rental Pricing & Occupancy Forecasting: worked example

> Run on synthetic data with `forecast` engine, seed 3894, knobs {"n_series": 214}, in 14.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons.

**Constraints that shape the design.** Local limits on rental nights are loaded and obeyed; Host-set minimum prices are never undercut; Prices refresh daily for the next 365 nights

**Label in this use case.** For "Short-Term Rental Pricing & Occupancy Forecasting": Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past prices are partly caused by the hosts' own expectations, so demand and price are tangled.

## 2. Choose the signals

Your strongest signal is **Event calendar** (number and size of events within 5 km in the stay window). Its rule: Event data are patchy, so combine providers. In the starter, the closest executable idea is **recent level and momentum**: mean of the last 7 and 28 days and their ratio, known at the forecast origin. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Error depends on the level you read it at: 2.8% on the aggregate but 12.6% per series. Report at the level the decision is made, by horizon, against a seasonal baseline.

## 4. Baseline against the stronger design

At 7 days the model's weighted absolute percentage error is 12.1% against 22.2% for the seasonal baseline, a forecast value added of 45.5%. At 14 days it is 15.3% against 23.9%. The upper band covers 89.8% of outcomes against a nominal 90%.

| Result | Value |
|---|---|
| WAPE at 7 days, model | 12.1% |
| WAPE at 7 days, seasonal baseline | 22.2% |
| Forecast value added at 7 days | 45.5% |
| 90th-percentile band coverage | 89.8% |
| Error at SKU level versus aggregate | 12.6% vs 2.8% |

## 5. An edge case from the blueprint

**Local ban.** A local ban or cap on short-term nights removes available supply. Planned response: Load regulation as configuration and cap nights in the occupancy forecast. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 19457 |
| `h1.wmape_model` | 0.11614 |
| `h1.wmape_baseline` | 0.2137 |
| `h1.fva` | 0.45651 |
| `h3.wmape_model` | 0.11541 |
| `h3.wmape_baseline` | 0.19857 |
| `h3.fva` | 0.41876 |
| `h7.wmape_model` | 0.12129 |
| `h7.wmape_baseline` | 0.22248 |
| `h7.fva` | 0.45482 |
| `h14.wmape_model` | 0.15346 |
| `h14.wmape_baseline` | 0.23882 |
| `h14.fva` | 0.35742 |
| `p90_coverage` | 0.89829 |
| `wmape_sku_level` | 0.126 |
| `wmape_aggregate` | 0.027837 |
| `late_feed.missing_as_zero` | 0.20152 |
| `late_feed.missing_as_nan` | 0.13844 |

</details>
