# Municipal Building Energy Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 34570, knobs {"n_series": 62, "anomalies_per_series": 2.907}, in 15.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed.

**Constraints that shape the design.** Baselines weather-adjusted per building; Estimated waste in energy and cost; Facilities team confirms before work

**Label in this use case.** For "Municipal Building Energy Anomaly Detection": Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Absolute use comparisons.

## 2. Choose the signals

Your strongest signal is **Weather-adjusted consumption** (use against expected for the weather). Its rule: From meters. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 55.1% of events at 0.33 false alerts per series-week. The seasonal score finds 87.6% at 0.95. Adding the calendar finds 92.1% at 0.62.

| Result | Value |
|---|---|
| Recall, naive z-score | 55.1% |
| Recall, seasonal z-score | 87.6% |
| Recall, seasonal with calendar | 92.1% |
| False alerts per series-week, with calendar | 0.62 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Occupancy change.** a building is used differently. Planned response: Schedule updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 189 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32906 |
| `naive_z.recall` | 0.55056 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 89 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.95023 |
| `seasonal_z.recall` | 0.8764 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 89 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.62118 |
| `seasonal_z_calendar.recall` | 0.92135 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 89 |

</details>
