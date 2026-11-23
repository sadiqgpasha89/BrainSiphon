# Performance Regression Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 57555, knobs {"n_series": 61, "anomalies_per_series": 2.78}, in 14.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them.

**Constraints that shape the design.** Regressions above 3% detected with 95% confidence; Culprit commit named within 10 builds; Noise estimated per benchmark

**Label in this use case.** For "Performance Regression Detection": Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed thresholds.

## 2. Choose the signals

Your strongest signal is **Benchmark time series** (measurements per commit). Its rule: From CI. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 46.2% of events at 0.23 false alerts per series-week. The seasonal score finds 82.8% at 0.65. Adding the calendar finds 96.8% at 0.55.

| Result | Value |
|---|---|
| Recall, naive z-score | 46.2% |
| Recall, seasonal z-score | 82.8% |
| Recall, seasonal with calendar | 96.8% |
| False alerts per series-week, with calendar | 0.55 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Noisy machine.** a bad runner distorts results. Planned response: Machine tagging and exclusion. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 61 |
| `hours` | 2016 |
| `events` | 166 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.23207 |
| `naive_z.recall` | 0.46237 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 93 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.64842 |
| `seasonal_z.recall` | 0.82796 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 93 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.54604 |
| `seasonal_z_calendar.recall` | 0.96774 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 93 |

</details>
