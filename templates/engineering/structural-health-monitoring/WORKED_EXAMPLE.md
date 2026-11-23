# Structural Health Monitoring: worked example

> Run on synthetic data with `anomaly` engine, seed 59756, knobs {"n_series": 76, "anomalies_per_series": 2.467}, in 16.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change.

**Constraints that shape the design.** Alerts reviewed by a structural engineer; Temperature and load effects removed before alerting; Detection within 10 minutes

**Label in this use case.** For "Structural Health Monitoring": Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed limits.

## 2. Choose the signals

Your strongest signal is **Strain and displacement** (measured response). Its rule: From sensors. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 58.8% of events at 0.26 false alerts per series-week. The seasonal score finds 84.3% at 0.70. Adding the calendar finds 97.1% at 0.58.

| Result | Value |
|---|---|
| Recall, naive z-score | 58.8% |
| Recall, seasonal z-score | 84.3% |
| Recall, seasonal with calendar | 97.1% |
| False alerts per series-week, with calendar | 0.58 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Sensor failure.** a gauge drifts or fails. Planned response: Redundant sensors and health alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 76 |
| `hours` | 2016 |
| `events` | 197 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.25748 |
| `naive_z.recall` | 0.58824 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 102 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.69575 |
| `seasonal_z.recall` | 0.84314 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 102 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.58345 |
| `seasonal_z_calendar.recall` | 0.97059 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 102 |

</details>
