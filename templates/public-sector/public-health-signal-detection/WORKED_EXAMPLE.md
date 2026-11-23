# Public Health Signal Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 14631, knobs {"n_series": 86, "anomalies_per_series": 1.947}, in 21.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking.

**Constraints that shape the design.** Aggregated data above a minimum count; Alerts reviewed by epidemiologists; Each alert states the data source

**Label in this use case.** For "Public Health Signal Detection": Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual-level tracking.

## 2. Choose the signals

Your strongest signal is **Syndromic counts** (visits and calls for symptoms). Its rule: Aggregated. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 50.6% of events at 0.31 false alerts per series-week. The seasonal score finds 95.5% at 0.54. Adding the calendar finds 100.0% at 0.54.

| Result | Value |
|---|---|
| Recall, naive z-score | 50.6% |
| Recall, seasonal z-score | 95.5% |
| Recall, seasonal with calendar | 100.0% |
| False alerts per series-week, with calendar | 0.54 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Reporting change.** a lab changes its reporting. Planned response: Source flags and baselines reset. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 86 |
| `hours` | 2016 |
| `events` | 168 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.30743 |
| `naive_z.recall` | 0.50562 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 89 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.53981 |
| `seasonal_z.recall` | 0.95506 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 89 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53739 |
| `seasonal_z_calendar.recall` | 1 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 89 |

</details>
