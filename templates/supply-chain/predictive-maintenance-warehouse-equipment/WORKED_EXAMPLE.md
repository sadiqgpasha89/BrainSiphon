# Warehouse Equipment Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 57843, knobs {"n_series": 95, "anomalies_per_series": 2.813}, in 5.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages.

**Constraints that shape the design.** Edge inference on PLC-adjacent hardware; Few failure labels; Low false alarms

**Label in this use case.** For "Warehouse Equipment Anomaly Detection": Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Seeded faults unlike real failures.

## 2. Choose the signals

Your strongest signal is **Spectral vibration features** (band energies and harmonics). Its rule: Sampling rate. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 46.6% of events at 0.26 false alerts per series-week. The seasonal score finds 86.3% at 0.63. Adding the calendar finds 98.5% at 0.45.

| Result | Value |
|---|---|
| Recall, naive z-score | 46.6% |
| Recall, seasonal z-score | 86.3% |
| Recall, seasonal with calendar | 98.5% |
| False alerts per series-week, with calendar | 0.45 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Normal operating mode change.** a legitimate change in speed or load makes healthy vibration look anomalous and floods alarms. Planned response: Mode detection and per-mode baselines. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 264 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.25858 |
| `naive_z.recall` | 0.46565 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 131 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.62673 |
| `seasonal_z.recall` | 0.8626 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 131 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.44704 |
| `seasonal_z_calendar.recall` | 0.98473 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 131 |

</details>
