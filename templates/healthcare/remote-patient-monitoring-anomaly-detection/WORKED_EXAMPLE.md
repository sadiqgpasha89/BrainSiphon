# Remote Patient Monitoring Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 47868, knobs {"n_series": 62, "anomalies_per_series": 1.833}, in 5.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise.

**Constraints that shape the design.** Personal baselines; Missing and irregular measurements; Care-team capacity

**Label in this use case.** For "Remote Patient Monitoring Anomaly Detection": Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Alerts judged only by acted-upon ones.

## 2. Choose the signals

Your strongest signal is **Deviation from personal baseline** (robust z-score over 14 days). Its rule: Window excludes current reading. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 58.5% of events at 0.33 false alerts per series-week. The seasonal score finds 94.3% at 0.73. Adding the calendar finds 96.2% at 0.61.

| Result | Value |
|---|---|
| Recall, naive z-score | 58.5% |
| Recall, seasonal z-score | 94.3% |
| Recall, seasonal with calendar | 96.2% |
| False alerts per series-week, with calendar | 0.61 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Faulty scale readings.** false weight-gain alert. Planned response: Plausibility and repeat-measure prompts. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 62 |
| `hours` | 2016 |
| `events` | 118 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32906 |
| `naive_z.recall` | 0.58491 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 53 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.73198 |
| `seasonal_z.recall` | 0.9434 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 53 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.61446 |
| `seasonal_z_calendar.recall` | 0.96226 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 53 |

</details>
