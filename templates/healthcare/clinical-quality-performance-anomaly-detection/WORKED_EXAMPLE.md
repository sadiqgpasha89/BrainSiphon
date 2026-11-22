# Clinical Quality Performance Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 63264, knobs {"n_series": 95, "anomalies_per_series": 2.233}, in 31.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating.

**Constraints that shape the design.** Data-quality gates run before any performance alarm; Alerts carry baseline comparison and a data-versus-performance classification; A quality analyst validates before any escalation

**Label in this use case.** For "Clinical Quality Performance Anomaly Detection": Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating data defects as performance.

## 2. Choose the signals

Your strongest signal is **Adjusted deviation from baseline** (standardised residual after seasonality and case mix). Its rule: Baseline fit on earlier periods. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 51.3% of events at 0.30 false alerts per series-week. The seasonal score finds 80.0% at 0.61. Adding the calendar finds 95.7% at 0.56.

| Result | Value |
|---|---|
| Recall, naive z-score | 51.3% |
| Recall, seasonal z-score | 80.0% |
| Recall, seasonal with calendar | 95.7% |
| False alerts per series-week, with calendar | 0.56 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Measure specification update.** step change in every series. Planned response: Version-aware baselines and a suppressed alert window. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 95 |
| `hours` | 2016 |
| `events` | 223 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29802 |
| `naive_z.recall` | 0.51304 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 115 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.61358 |
| `seasonal_z.recall` | 0.8 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 115 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.56318 |
| `seasonal_z_calendar.recall` | 0.95652 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 115 |

</details>
