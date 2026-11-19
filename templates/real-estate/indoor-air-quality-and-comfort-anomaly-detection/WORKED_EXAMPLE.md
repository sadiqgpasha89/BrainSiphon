# Indoor Air Quality & Comfort Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 76261, knobs {"n_series": 79, "anomalies_per_series": 3.4}, in 4.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.

**Constraints that shape the design.** Alerts are tuned to occupancy and room use so normal meetings do not alarm; Sensor health is tracked and faulty devices are excluded; No personal data collected and counts only

**Label in this use case.** For "Indoor Air Quality & Comfort Anomaly Detection": Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled events, so recall is poorly estimated.

## 2. Choose the signals

Your strongest signal is **CO2 vs occupancy** (residual between measured CO2 and the CO2 expected for the current occupancy). Its rule: Occupancy counts are noisy, so smooth them. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 54.0% of events at 0.31 false alerts per series-week. The seasonal score finds 88.5% at 0.62. Adding the calendar finds 96.5% at 0.55.

| Result | Value |
|---|---|
| Recall, naive z-score | 54.0% |
| Recall, seasonal z-score | 88.5% |
| Recall, seasonal with calendar | 96.5% |
| False alerts per series-week, with calendar | 0.55 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Sensor drift.** Sensor drift makes readings wrong over time. Planned response: Calibrate sensors on a schedule and flag drifting devices. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 79 |
| `hours` | 2016 |
| `events` | 235 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.30568 |
| `naive_z.recall` | 0.53982 |
| `naive_z.median_delay_h` | 3 |
| `naive_z.events` | 113 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.61663 |
| `seasonal_z.recall` | 0.88496 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 113 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.55339 |
| `seasonal_z_calendar.recall` | 0.9646 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 113 |

</details>
