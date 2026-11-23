# Cloud Cost Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 42914, knobs {"n_series": 82, "anomalies_per_series": 2.32}, in 18.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes.

**Constraints that shape the design.** Alerts within 24 hours of the spend; Each alert names the resource and owner; Budget owners set thresholds

**Label in this use case.** For "Cloud Cost Anomaly Detection": Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Total-spend budgets only.

## 2. Choose the signals

Your strongest signal is **Spend deviation by service** (residual versus baseline). Its rule: From billing. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 58.4% of events at 0.27 false alerts per series-week. The seasonal score finds 86.1% at 0.56. Adding the calendar finds 94.1% at 0.46.

| Result | Value |
|---|---|
| Recall, naive z-score | 58.4% |
| Recall, seasonal z-score | 86.1% |
| Recall, seasonal with calendar | 94.1% |
| False alerts per series-week, with calendar | 0.46 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Untagged resources.** the owner is unknown. Planned response: Fallback owner by account. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 82 |
| `hours` | 2016 |
| `events` | 187 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.26657 |
| `naive_z.recall` | 0.58416 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 101 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.55599 |
| `seasonal_z.recall` | 0.86139 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 101 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.46205 |
| `seasonal_z_calendar.recall` | 0.94059 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 101 |

</details>
