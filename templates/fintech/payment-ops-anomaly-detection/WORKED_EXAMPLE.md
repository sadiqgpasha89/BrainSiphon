# Payments Operations Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 51663, knobs {"n_series": 90, "anomalies_per_series": 3.473}, in 9.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset.

**Constraints that shape the design.** Alert latency under 3 minutes; 50k dimension combinations; False alerts under 1 per day per team

**Label in this use case.** For "Payments Operations Anomaly Detection": Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic injected anomalies unlike real outages.

## 2. Choose the signals

Your strongest signal is **Success-rate residual z-score** (residual of success rate vs seasonal forecast). Its rule: Forecast uses only past data. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 56.1% of events at 0.25 false alerts per series-week. The seasonal score finds 91.2% at 0.65. Adding the calendar finds 96.5% at 0.46.

| Result | Value |
|---|---|
| Recall, naive z-score | 56.1% |
| Recall, seasonal z-score | 91.2% |
| Recall, seasonal with calendar | 96.5% |
| False alerts per series-week, with calendar | 0.46 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Planned maintenance window.** alerts fire for known downtime. Planned response: Change-calendar suppression with automatic registration. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 90 |
| `hours` | 2016 |
| `events` | 301 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.2475 |
| `naive_z.recall` | 0.5614 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 171 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.65461 |
| `seasonal_z.recall` | 0.91228 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 171 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.46031 |
| `seasonal_z_calendar.recall` | 0.96491 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 171 |

</details>
