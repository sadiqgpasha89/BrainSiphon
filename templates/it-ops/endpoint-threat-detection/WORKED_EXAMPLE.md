# Endpoint Threat Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 2269, knobs {"n_series": 90, "anomalies_per_series": 2.727}, in 22.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles.

**Constraints that shape the design.** Detection within 60 s of the behaviour; Containment only after analyst or pre-approved policy; Device-level signals only

**Label in this use case.** For "Endpoint Threat Detection": Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Content monitoring.

## 2. Choose the signals

Your strongest signal is **Process lineage anomaly** (unusual parent and child processes). Its rule: From endpoint events. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 61.5% of events at 0.31 false alerts per series-week. The seasonal score finds 75.4% at 0.45. Adding the calendar finds 100.0% at 0.50.

| Result | Value |
|---|---|
| Recall, naive z-score | 61.5% |
| Recall, seasonal z-score | 75.4% |
| Recall, seasonal with calendar | 100.0% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Admin tools.** legitimate scripts look malicious. Planned response: Role-based baselines and allow-lists. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 90 |
| `hours` | 2016 |
| `events` | 239 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.31227 |
| `naive_z.recall` | 0.61475 |
| `naive_z.median_delay_h` | 4 |
| `naive_z.events` | 122 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.45337 |
| `seasonal_z.recall` | 0.7541 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 122 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.495 |
| `seasonal_z_calendar.recall` | 1 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 122 |

</details>
