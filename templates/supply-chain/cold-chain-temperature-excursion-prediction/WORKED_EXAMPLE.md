# Cold-Chain Excursion Prediction: worked example

> Run on synthetic data with `anomaly` engine, seed 4778, knobs {"n_series": 68, "anomalies_per_series": 3.493}, in 4.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load.

**Constraints that shape the design.** GDP / HACCP compliance; Intervention lead time of 15-60 minutes; Sensor drift

**Label in this use case.** For "Cold-Chain Excursion Prediction": Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Excursion labels incomplete.

## 2. Choose the signals

Your strongest signal is **Door-open events** (duration and count). Its rule: Sensor. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 47.0% of events at 0.28 false alerts per series-week. The seasonal score finds 74.8% at 0.41. Adding the calendar finds 99.1% at 0.54.

| Result | Value |
|---|---|
| Recall, naive z-score | 47.0% |
| Recall, seasonal z-score | 74.8% |
| Recall, seasonal with calendar | 99.1% |
| False alerts per series-week, with calendar | 0.54 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Sensor drift.** false alarms or misses. Planned response: Redundant sensors and drift detection. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 68 |
| `hours` | 2016 |
| `events` | 237 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.27553 |
| `naive_z.recall` | 0.46957 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 115 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.4133 |
| `seasonal_z.recall` | 0.74783 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 115 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.54188 |
| `seasonal_z_calendar.recall` | 0.9913 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 115 |

</details>
