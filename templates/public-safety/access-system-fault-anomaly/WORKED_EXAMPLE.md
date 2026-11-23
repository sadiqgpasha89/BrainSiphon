# Door and Access System Fault Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 83245, knobs {"n_series": 108, "anomalies_per_series": 3.087}, in 25.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people.

**Constraints that shape the design.** Analysis at the door and reader level; No individual employee scoring; Facilities and security review alerts

**Label in this use case.** For "Door and Access System Fault Detection": Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Employee scoring.

## 2. Choose the signals

Your strongest signal is **Door open duration** (time doors stay open). Its rule: From controllers. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 44.0% of events at 0.26 false alerts per series-week. The seasonal score finds 82.2% at 0.49. Adding the calendar finds 97.4% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 44.0% |
| Recall, seasonal z-score | 82.2% |
| Recall, seasonal with calendar | 97.4% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Firmware update.** event codes change. Planned response: Versioned code maps. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 108 |
| `hours` | 2016 |
| `events` | 342 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.26408 |
| `naive_z.recall` | 0.43979 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 191 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.49346 |
| `seasonal_z.recall` | 0.82199 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 191 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51659 |
| `seasonal_z_calendar.recall` | 0.97382 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 191 |

</details>
