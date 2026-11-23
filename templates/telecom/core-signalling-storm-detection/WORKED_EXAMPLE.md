# Core Signalling Storm Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 67425, knobs {"n_series": 95, "anomalies_per_series": 2.787}, in 21.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions.

**Constraints that shape the design.** Detection decision under 80 ms per window; Throttling limited to approved templates with automatic expiry; Emergency calls and priority traffic never throttled

**Label in this use case.** For "Core Signalling Storm Detection": Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Global thresholds.

## 2. Choose the signals

Your strongest signal is **Rate versus expected** (ratio of signalling per minute to the time-adjusted baseline). Its rule: Baseline per function. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 49.0% of events at 0.29 false alerts per series-week. The seasonal score finds 84.6% at 0.69. Adding the calendar finds 96.6% at 0.58.

| Result | Value |
|---|---|
| Recall, naive z-score | 49.0% |
| Recall, seasonal z-score | 84.6% |
| Recall, seasonal with calendar | 96.6% |
| False alerts per series-week, with calendar | 0.58 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Firmware update storm.** legitimate devices all reconnect. Planned response: Event calendar for known mass updates and staged throttling. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 95 |
| `hours` | 2016 |
| `events` | 287 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28707 |
| `naive_z.recall` | 0.48993 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 149 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.69028 |
| `seasonal_z.recall` | 0.84564 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 149 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.5829 |
| `seasonal_z_calendar.recall` | 0.96644 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 149 |

</details>
