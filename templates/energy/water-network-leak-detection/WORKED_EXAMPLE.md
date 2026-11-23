# Water Network Leak Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 9086, knobs {"n_series": 66, "anomalies_per_series": 2.52}, in 14.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst.

**Constraints that shape the design.** Night-flow baselines per district; Leak area list within 24 hours; Estimated loss volume with a range

**Label in this use case.** For "Water Network Leak Detection": Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Total flow monitoring.

## 2. Choose the signals

Your strongest signal is **Minimum night flow** (flow in the lowest-use hours). Its rule: From district meters. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 56.8% of events at 0.31 false alerts per series-week. The seasonal score finds 91.4% at 0.71. Adding the calendar finds 95.1% at 0.57.

| Result | Value |
|---|---|
| Recall, naive z-score | 56.8% |
| Recall, seasonal z-score | 91.4% |
| Recall, seasonal with calendar | 95.1% |
| False alerts per series-week, with calendar | 0.57 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Large user event.** a customer fills a tank. Planned response: Customer event flags and filters. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 66 |
| `hours` | 2016 |
| `events` | 162 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.30911 |
| `naive_z.recall` | 0.5679 |
| `naive_z.median_delay_h` | 0.5 |
| `naive_z.events` | 81 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.7097 |
| `seasonal_z.recall` | 0.91358 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 81 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.57407 |
| `seasonal_z_calendar.recall` | 0.95062 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 81 |

</details>
