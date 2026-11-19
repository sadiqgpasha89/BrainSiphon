# Predictive Maintenance for Building Equipment: worked example

> Run on synthetic data with `anomaly` engine, seed 85243, knobs {"n_series": 114, "anomalies_per_series": 3.36}, in 6.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.

**Constraints that shape the design.** Alerts raised with at least 7 days of lead time; Safety-critical equipment such as lifts and fire pumps takes priority; Each alert shows the sensors and trend behind it

**Label in this use case.** For "Predictive Maintenance for Building Equipment": Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Maintenance resets the history, so a repaired machine looks as though it had no problem.

## 2. Choose the signals

Your strongest signal is **Vibration trend** (slope of RMS vibration over the last 14 days). Its rule: Sensors loosen and drift, so calibrate per sensor. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 45.5% of events at 0.22 false alerts per series-week. The seasonal score finds 84.1% at 0.64. Adding the calendar finds 94.3% at 0.54.

| Result | Value |
|---|---|
| Recall, naive z-score | 45.5% |
| Recall, seasonal z-score | 84.1% |
| Recall, seasonal with calendar | 94.3% |
| False alerts per series-week, with calendar | 0.54 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Sensor drift.** Sensor readings drift over time and normal behaviour looks like a fault. Planned response: Calibrate against reference readings and monitor per-sensor baselines. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 114 |
| `hours` | 2016 |
| `events` | 341 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.21548 |
| `naive_z.recall` | 0.45455 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 176 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.63914 |
| `seasonal_z.recall` | 0.84091 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 176 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53871 |
| `seasonal_z_calendar.recall` | 0.94318 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 176 |

</details>
