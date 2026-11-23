# Metric Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 69420, knobs {"n_series": 88, "anomalies_per_series": 3.093}, in 21.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds.

**Constraints that shape the design.** Detection within 60 s of onset; False alert rate under 1 per service per week; Alerts show the baseline and deviation

**Label in this use case.** For "Metric Anomaly Detection": Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed thresholds only.

## 2. Choose the signals

Your strongest signal is **Deviation from seasonal baseline** (residual after seasonal fit). Its rule: From time-series. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 57.8% of events at 0.24 false alerts per series-week. The seasonal score finds 83.0% at 0.54. Adding the calendar finds 97.8% at 0.51.

| Result | Value |
|---|---|
| Recall, naive z-score | 57.8% |
| Recall, seasonal z-score | 83.0% |
| Recall, seasonal with calendar | 97.8% |
| False alerts per series-week, with calendar | 0.51 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**New metric.** too little history exists for a baseline. Planned response: Use static limits until the baseline is ready. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 88 |
| `hours` | 2016 |
| `events` | 290 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.23893 |
| `naive_z.recall` | 0.57778 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 135 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.54174 |
| `seasonal_z.recall` | 0.82963 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 135 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51335 |
| `seasonal_z_calendar.recall` | 0.97778 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 135 |

</details>
