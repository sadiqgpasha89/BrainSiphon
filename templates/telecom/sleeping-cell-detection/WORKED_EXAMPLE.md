# Sleeping Cell Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 30905, knobs {"n_series": 69, "anomalies_per_series": 3.307}, in 19.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days.

**Constraints that shape the design.** No dependence on alarms alone; False alarm rate low enough for dispatch; Distinguish planned downtime

**Label in this use case.** For "Sleeping Cell Detection": Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on alarmed cells.

## 2. Choose the signals

Your strongest signal is **Traffic deviation from peers** (ratio of actual to predicted traffic from similar cells). Its rule: Peers from the same area and class. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 58.1% of events at 0.27 false alerts per series-week. The seasonal score finds 90.6% at 0.68. Adding the calendar finds 97.4% at 0.62.

| Result | Value |
|---|---|
| Recall, naive z-score | 58.1% |
| Recall, seasonal z-score | 90.6% |
| Recall, seasonal with calendar | 97.4% |
| False alerts per series-week, with calendar | 0.62 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Low-traffic hours.** normal traffic looks like an outage. Planned response: Scale scores by expected traffic and require several KPIs. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 69 |
| `hours` | 2016 |
| `events` | 241 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.26852 |
| `naive_z.recall` | 0.5812 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 117 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.68186 |
| `seasonal_z.recall` | 0.90598 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 117 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.62152 |
| `seasonal_z_calendar.recall` | 0.97436 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 117 |

</details>
