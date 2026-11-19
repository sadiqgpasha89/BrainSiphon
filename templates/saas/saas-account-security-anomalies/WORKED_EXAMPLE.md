# SaaS Account Security Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 36904, knobs {"n_series": 119, "anomalies_per_series": 2.22}, in 6.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses.

**Constraints that shape the design.** Per-tenant privacy; Real-time decisions; Customer-configurable policies

**Label in this use case.** For "SaaS Account Security Anomaly Detection": Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from reported takeovers.

## 2. Choose the signals

Your strongest signal is **New device or location for user** (novelty vs history). Its rule: History. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 50.7% of events at 0.29 false alerts per series-week. The seasonal score finds 83.8% at 0.61. Adding the calendar finds 100.0% at 0.54.

| Result | Value |
|---|---|
| Recall, naive z-score | 50.7% |
| Recall, seasonal z-score | 83.8% |
| Recall, seasonal with calendar | 100.0% |
| False alerts per series-week, with calendar | 0.54 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Tenant uses a VPN that changes IP constantly.** a tenant-wide VPN rotates IPs constantly and produces a stream of false alarms. Planned response: Tenant-level network profiles. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 119 |
| `hours` | 2016 |
| `events` | 249 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29215 |
| `naive_z.recall` | 0.50735 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 136 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.60704 |
| `seasonal_z.recall` | 0.83824 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 136 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53532 |
| `seasonal_z_calendar.recall` | 1 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 136 |

</details>
