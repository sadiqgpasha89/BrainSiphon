# Robot Cell Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 22381, knobs {"n_series": 91, "anomalies_per_series": 1.92}, in 20.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal behaviour in robot cells from joint currents, torque and cycle signatures so drive wear, tool faults and programme errors are found early.

**Constraints that shape the design.** Baselines per robot programme and payload; False alarms under 1 per robot per month; Alerts include the joint and the cycle step

**Label in this use case.** For "Robot Cell Anomaly Detection": Detect abnormal behaviour in robot cells from joint currents, torque and cycle signatures so drive wear, tool faults and programme errors are found early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Global torque limits.

## 2. Choose the signals

Your strongest signal is **Current profile deviation** (distance between the cycle current profile and the baseline). Its rule: Per step. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 65.3% of events at 0.30 false alerts per series-week. The seasonal score finds 87.4% at 0.64. Adding the calendar finds 94.7% at 0.58.

| Result | Value |
|---|---|
| Recall, naive z-score | 65.3% |
| Recall, seasonal z-score | 87.4% |
| Recall, seasonal with calendar | 94.7% |
| False alerts per series-week, with calendar | 0.58 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Programme edit.** signatures change on purpose. Planned response: Programme version triggers a baseline reset. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 91 |
| `hours` | 2016 |
| `events` | 194 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29969 |
| `naive_z.recall` | 0.65263 |
| `naive_z.median_delay_h` | 5 |
| `naive_z.events` | 95 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.63826 |
| `seasonal_z.recall` | 0.87368 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 95 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.57649 |
| `seasonal_z_calendar.recall` | 0.94737 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 95 |

</details>
