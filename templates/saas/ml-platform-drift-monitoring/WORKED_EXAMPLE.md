# ML Platform: Drift & Quality Monitoring: worked example

> Run on synthetic data with `anomaly` engine, seed 61641, knobs {"n_series": 102, "anomalies_per_series": 2.547}, in 5.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness.

**Constraints that shape the design.** Thousands of models; Delayed or missing labels; Low-noise alerts

**Label in this use case.** For "ML Platform: Drift & Quality Monitoring": Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Drift without link to performance.

## 2. Choose the signals

Your strongest signal is **Importance-weighted PSI** (PSI weighted by feature importance). Its rule: Importance estimates. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 51.7% of events at 0.29 false alerts per series-week. The seasonal score finds 81.4% at 0.56. Adding the calendar finds 95.8% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 51.7% |
| Recall, seasonal z-score | 81.4% |
| Recall, seasonal with calendar | 95.8% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Upstream schema change.** drift alerts for all features. Planned response: Schema-change detection and grouped alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 102 |
| `hours` | 2016 |
| `events` | 261 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28778 |
| `naive_z.recall` | 0.51695 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 118 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.55718 |
| `seasonal_z.recall` | 0.81356 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 118 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53065 |
| `seasonal_z_calendar.recall` | 0.95763 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 118 |

</details>
