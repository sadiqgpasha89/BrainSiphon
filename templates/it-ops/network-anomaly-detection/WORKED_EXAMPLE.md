# Network Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 5635, knobs {"n_series": 87, "anomalies_per_series": 3.113}, in 20.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team.

**Constraints that shape the design.** Detection within 2 minutes; Flow data summarised with no payload inspection; False alerts under 5 per site per week

**Label in this use case.** For "Network Anomaly Detection": Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed thresholds.

## 2. Choose the signals

Your strongest signal is **Link utilisation and error rates** (bandwidth, loss and errors). Its rule: From device telemetry. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 48.6% of events at 0.23 false alerts per series-week. The seasonal score finds 74.0% at 0.53. Adding the calendar finds 95.9% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 48.6% |
| Recall, seasonal z-score | 74.0% |
| Recall, seasonal with calendar | 95.9% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Planned traffic.** backups or migrations spike flows. Planned response: Calendar-aware suppression. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 87 |
| `hours` | 2016 |
| `events` | 276 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.2345 |
| `naive_z.recall` | 0.4863 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 146 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.52882 |
| `seasonal_z.recall` | 0.73973 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 146 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53361 |
| `seasonal_z_calendar.recall` | 0.9589 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 146 |

</details>
