# Schedule vs Actual Time Discrepancy Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 38947, knobs {"n_series": 100, "anomalies_per_series": 2.413}, in 29.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path.

**Constraints that shape the design.** Deterministic reconciliation rules run first and anomaly models only rank the rest; The system never infers intent or wrongdoing and describes discrepancies neutrally; Employee or manager correction and documented adjudication precede any payroll change

**Label in this use case.** For "Schedule vs Actual Time Discrepancy Detection": Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on already-corrected data.

## 2. Choose the signals

Your strongest signal is **Punch-to-schedule delta** (minutes between scheduled and actual start and end). Its rule: Use punch time not the entry time. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 55.9% of events at 0.32 false alerts per series-week. The seasonal score finds 82.8% at 0.63. Adding the calendar finds 97.2% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 55.9% |
| Recall, seasonal z-score | 82.8% |
| Recall, seasonal with calendar | 97.2% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Daylight-saving change.** shifts appear to overlap or vanish. Planned response: Time-zone aware storage in UTC with local rendering. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 100 |
| `hours` | 2016 |
| `events` | 276 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.31851 |
| `naive_z.recall` | 0.55862 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 145 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.63286 |
| `seasonal_z.recall` | 0.82759 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 145 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51628 |
| `seasonal_z_calendar.recall` | 0.97241 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 145 |

</details>
