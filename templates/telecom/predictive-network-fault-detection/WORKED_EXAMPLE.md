# Predictive Network Fault Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 54060, knobs {"n_series": 111, "anomalies_per_series": 2.467}, in 24.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected.

**Constraints that shape the design.** Alerts need at least 12 hours of lead time for planned work; Precision above 40% at the chosen threshold to avoid alert fatigue; Per-vendor models must be explainable to engineers

**Label in this use case.** For "Predictive Network Fault Detection": Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split across time.

## 2. Choose the signals

Your strongest signal is **Counter drift against peers** (z-score of error and retransmit counters versus similar elements). Its rule: Peer groups must exclude the failing element. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 59.9% of events at 0.27 false alerts per series-week. The seasonal score finds 91.2% at 0.78. Adding the calendar finds 95.2% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 59.9% |
| Recall, seasonal z-score | 91.2% |
| Recall, seasonal with calendar | 95.2% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**New equipment type.** no history exists. Planned response: Fall back to rules and collect labels. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 111 |
| `hours` | 2016 |
| `events` | 284 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.26819 |
| `naive_z.recall` | 0.59864 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 147 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.78208 |
| `seasonal_z.recall` | 0.91156 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 147 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53076 |
| `seasonal_z_calendar.recall` | 0.95238 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 147 |

</details>
