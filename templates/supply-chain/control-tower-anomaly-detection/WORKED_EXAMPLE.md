# Supply-Chain Control Tower Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 75477, knobs {"n_series": 76, "anomalies_per_series": 3.38}, in 10.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact.

**Constraints that shape the design.** Millions of entities; Alert dedup; Impact ranking

**Label in this use case.** For "Supply-Chain Control Tower Anomaly Detection": Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from alerts people acted upon.

## 2. Choose the signals

Your strongest signal is **Residual to expected milestone time** (actual minus predicted). Its rule: Predictor. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 51.4% of events at 0.27 false alerts per series-week. The seasonal score finds 78.3% at 0.61. Adding the calendar finds 97.8% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 51.4% |
| Recall, seasonal z-score | 78.3% |
| Recall, seasonal with calendar | 97.8% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Upstream outage causes thousands of simultaneous anomalies.** one upstream outage triggers thousands of correlated alerts that bury the root cause. Planned response: Correlation clustering and incident mode. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 76 |
| `hours` | 2016 |
| `events` | 248 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.27392 |
| `naive_z.recall` | 0.51449 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 138 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.61084 |
| `seasonal_z.recall` | 0.78261 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 138 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53414 |
| `seasonal_z_calendar.recall` | 0.97826 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 138 |

</details>
