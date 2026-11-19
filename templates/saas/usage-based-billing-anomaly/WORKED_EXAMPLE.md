# Usage-Based Billing Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 7918, knobs {"n_series": 86, "anomalies_per_series": 2.013}, in 6.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue.

**Constraints that shape the design.** Invoice cut-off deadlines; High precision for customer-facing holds; Meter reconciliation

**Label in this use case.** For "Usage-Based Billing Anomaly Detection": Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Injected errors unlike real bugs.

## 2. Choose the signals

Your strongest signal is **Meter reconciliation gap** (difference between independent meters). Its rule: Time alignment. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 52.3% of events at 0.30 false alerts per series-week. The seasonal score finds 83.2% at 0.69. Adding the calendar finds 97.2% at 0.48.

| Result | Value |
|---|---|
| Recall, naive z-score | 52.3% |
| Recall, seasonal z-score | 83.2% |
| Recall, seasonal with calendar | 97.2% |
| False alerts per series-week, with calendar | 0.48 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Pricing migration changes units.** all invoices look anomalous. Planned response: Rate-card event correlation and unit normalisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 86 |
| `hours` | 2016 |
| `events` | 184 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29774 |
| `naive_z.recall` | 0.52336 |
| `naive_z.median_delay_h` | 2.5 |
| `naive_z.events` | 107 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.69474 |
| `seasonal_z.recall` | 0.83178 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 107 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.47687 |
| `seasonal_z_calendar.recall` | 0.97196 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 107 |

</details>
