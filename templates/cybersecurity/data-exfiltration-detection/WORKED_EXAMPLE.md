# Data Exfiltration Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 14500, knobs {"n_series": 85, "anomalies_per_series": 3.447}, in 4.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers.

**Constraints that shape the design.** Encrypted transfers; Cloud SaaS egress; Legitimate bulk transfers

**Label in this use case.** For "Data Exfiltration Detection": Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic exfil unlike real incidents.

## 2. Choose the signals

Your strongest signal is **Volume z-score vs personal baseline** (outbound bytes vs 30-day baseline). Its rule: Window. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 48.8% of events at 0.25 false alerts per series-week. The seasonal score finds 86.4% at 0.55. Adding the calendar finds 95.1% at 0.49.

| Result | Value |
|---|---|
| Recall, naive z-score | 48.8% |
| Recall, seasonal z-score | 86.4% |
| Recall, seasonal with calendar | 95.1% |
| False alerts per series-week, with calendar | 0.49 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Scheduled backup to a new cloud region.** flagged as exfiltration. Planned response: Change-management feed and approved destination registry. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 85 |
| `hours` | 2016 |
| `events` | 320 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.25226 |
| `naive_z.recall` | 0.48765 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 162 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.55351 |
| `seasonal_z.recall` | 0.8642 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 162 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.48983 |
| `seasonal_z_calendar.recall` | 0.95062 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 162 |

</details>
