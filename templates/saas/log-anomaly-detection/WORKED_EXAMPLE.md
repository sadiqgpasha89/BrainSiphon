# Log Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 63475, knobs {"n_series": 87, "anomalies_per_series": 3.2}, in 13.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules.

**Constraints that shape the design.** Billions of lines per day; Log format drift; Low alert noise

**Label in this use case.** For "Log Anomaly Detection": Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logs from one service only.

## 2. Choose the signals

Your strongest signal is **New template appearance** (previously unseen templates). Its rule: Template store. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 46.8% of events at 0.21 false alerts per series-week. The seasonal score finds 91.1% at 0.64. Adding the calendar finds 95.6% at 0.51.

| Result | Value |
|---|---|
| Recall, naive z-score | 46.8% |
| Recall, seasonal z-score | 91.1% |
| Recall, seasonal with calendar | 95.6% |
| False alerts per series-week, with calendar | 0.51 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Deploy introduces many new templates.** a deploy changes log formats and produces a storm of novelty alerts. Planned response: Deploy-aware grace periods and template aliasing. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 87 |
| `hours` | 2016 |
| `events` | 294 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.21296 |
| `naive_z.recall` | 0.46835 |
| `naive_z.median_delay_h` | 1.5 |
| `naive_z.events` | 158 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.63889 |
| `seasonal_z.recall` | 0.91139 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 158 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51207 |
| `seasonal_z_calendar.recall` | 0.9557 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 158 |

</details>
