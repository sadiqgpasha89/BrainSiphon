# Container Runtime Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 4127, knobs {"n_series": 74, "anomalies_per_series": 3.327}, in 4.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect compromised containers via syscalls, process trees and network behaviour with low overhead.

**Constraints that shape the design.** Under 3% overhead; Ephemeral workloads; Sparse labelled attacks

**Label in this use case.** For "Container Runtime Anomaly Detection": Detect compromised containers via syscalls, process trees and network behaviour with low overhead. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulated attacks lacking realism.

## 2. Choose the signals

Your strongest signal is **Syscall n-gram novelty** (rare syscall sequences for the image). Its rule: Profile coverage. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 60.1% of events at 0.31 false alerts per series-week. The seasonal score finds 84.1% at 0.66. Adding the calendar finds 94.9% at 0.55.

| Result | Value |
|---|---|
| Recall, naive z-score | 60.1% |
| Recall, seasonal z-score | 84.1% |
| Recall, seasonal with calendar | 94.9% |
| False alerts per series-week, with calendar | 0.55 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Rolling deployment changes behaviour.** alerts fire on new but legitimate version. Planned response: Version-aware profile warm-up. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 74 |
| `hours` | 2016 |
| `events` | 273 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.30945 |
| `naive_z.recall` | 0.60145 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 138 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.65548 |
| `seasonal_z.recall` | 0.84058 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 138 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.54577 |
| `seasonal_z_calendar.recall` | 0.94928 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 138 |

</details>
