# Campaign Performance Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 90083, knobs {"n_series": 112, "anomalies_per_series": 2.233}, in 13.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes.

**Constraints that shape the design.** Hundreds of thousands of campaigns; Seasonality; Low noise alerts

**Label in this use case.** For "Campaign Performance Anomaly Detection": Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic anomaly tests only.

## 2. Choose the signals

Your strongest signal is **Seasonal residual** (residual vs expected for hour and weekday). Its rule: Forecast. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 51.4% of events at 0.28 false alerts per series-week. The seasonal score finds 97.2% at 0.83. Adding the calendar finds 97.2% at 0.49.

| Result | Value |
|---|---|
| Recall, naive z-score | 51.4% |
| Recall, seasonal z-score | 97.2% |
| Recall, seasonal with calendar | 97.2% |
| False alerts per series-week, with calendar | 0.49 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Platform reporting delays.** spend appears to drop. Planned response: Data-freshness checks per source. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Choose the threshold from alert capacity, not from recall alone. Replay your own labelled incidents through the same harness before trusting any score.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `series` | 112 |
| `hours` | 2016 |
| `events` | 283 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28439 |
| `naive_z.recall` | 0.51408 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 142 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.829 |
| `seasonal_z.recall` | 0.97183 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 142 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.49442 |
| `seasonal_z_calendar.recall` | 0.97183 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 142 |

</details>
