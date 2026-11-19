# AIOps Incident Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 44134, knobs {"n_series": 116, "anomalies_per_series": 2.48}, in 5.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope.

**Constraints that shape the design.** Millions of time series; Seasonality; Alert budget per team

**Label in this use case.** For "AIOps Incident Detection": Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic anomalies only.

## 2. Choose the signals

Your strongest signal is **SLI burn rate** (error budget burn over multiple windows). Its rule: Window choices. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 54.2% of events at 0.33 false alerts per series-week. The seasonal score finds 89.7% at 0.77. Adding the calendar finds 96.1% at 0.50.

| Result | Value |
|---|---|
| Recall, naive z-score | 54.2% |
| Recall, seasonal z-score | 89.7% |
| Recall, seasonal with calendar | 96.1% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Traffic from a marketing campaign.** anomaly alerts for expected load. Planned response: Campaign calendar covariates. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 116 |
| `hours` | 2016 |
| `events` | 297 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32662 |
| `naive_z.recall` | 0.54194 |
| `naive_z.median_delay_h` | 4 |
| `naive_z.events` | 155 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.76631 |
| `seasonal_z.recall` | 0.89677 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 155 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.49891 |
| `seasonal_z_calendar.recall` | 0.96129 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 155 |

</details>
