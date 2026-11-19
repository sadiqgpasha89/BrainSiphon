# Learned Trace & Telemetry Sampling: worked example

> Run on synthetic data with `anomaly` engine, seed 47882, knobs {"n_series": 112, "anomalies_per_series": 3.08}, in 6.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%.

**Constraints that shape the design.** Decision under 100 microseconds; Trillions of spans; Tail-based sampling needs buffering

**Label in this use case.** For "Learned Trace & Telemetry Sampling": Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on already-sampled data.

## 2. Choose the signals

Your strongest signal is **Error and latency outlier flags** (error status, latency percentiles). Its rule: Thresholds. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 52.4% of events at 0.27 false alerts per series-week. The seasonal score finds 80.6% at 0.64. Adding the calendar finds 94.2% at 0.49.

| Result | Value |
|---|---|
| Recall, naive z-score | 52.4% |
| Recall, seasonal z-score | 80.6% |
| Recall, seasonal with calendar | 94.2% |
| False alerts per series-week, with calendar | 0.49 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Buffer memory exhausted during spikes.** traces dropped unpredictably. Planned response: Backpressure policies with priority classes. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 395 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.2658 |
| `naive_z.recall` | 0.52427 |
| `naive_z.median_delay_h` | 1.5 |
| `naive_z.events` | 206 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.64312 |
| `seasonal_z.recall` | 0.80583 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 206 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.49442 |
| `seasonal_z_calendar.recall` | 0.94175 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 206 |

</details>
