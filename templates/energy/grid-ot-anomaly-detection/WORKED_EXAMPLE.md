# Grid OT Network Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 17830, knobs {"n_series": 90, "anomalies_per_series": 2.9}, in 21.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations.

**Constraints that shape the design.** Passive monitoring only with no inline blocking; Baselines per zone and protocol; Alerts include the device and the change

**Label in this use case.** For "Grid OT Network Anomaly Detection": Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Inline blocking.

## 2. Choose the signals

Your strongest signal is **New or changed device** (devices not in the inventory). Its rule: From passive discovery. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 43.8% of events at 0.25 false alerts per series-week. The seasonal score finds 83.6% at 0.61. Adding the calendar finds 95.3% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 43.8% |
| Recall, seasonal z-score | 83.6% |
| Recall, seasonal with calendar | 95.3% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Maintenance work.** legitimate changes trigger alerts. Planned response: Change calendar enrichment. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 243 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.24981 |
| `naive_z.recall` | 0.4375 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 128 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.60603 |
| `seasonal_z.recall` | 0.83594 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 128 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51813 |
| `seasonal_z_calendar.recall` | 0.95312 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 128 |

</details>
