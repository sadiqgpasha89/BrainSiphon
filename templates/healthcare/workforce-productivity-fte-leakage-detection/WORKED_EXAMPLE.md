# Workforce Productivity & FTE Leakage Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 51878, knobs {"n_series": 97, "anomalies_per_series": 2.807}, in 17.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached.

**Constraints that shape the design.** Variance is normalised for case mix, acuity and local operating conditions before it is flagged; Findings are investigation leads and never allegations of misconduct; Flags are at cost-centre and unit level and never rank individual employees

**Label in this use case.** For "Workforce Productivity & FTE Leakage Detection": Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Calling a data gap a leakage finding.

## 2. Choose the signals

Your strongest signal is **Hours per workload unit** (worked hours divided by acuity-weighted workload). Its rule: Use the settled workload for the period. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 53.2% of events at 0.29 false alerts per series-week. The seasonal score finds 80.5% at 0.51. Adding the calendar finds 96.8% at 0.56.

| Result | Value |
|---|---|
| Recall, naive z-score | 53.2% |
| Recall, seasonal z-score | 80.5% |
| Recall, seasonal with calendar | 96.8% |
| False alerts per series-week, with calendar | 0.56 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Unit changes service mix.** the baseline no longer applies. Planned response: Baseline reset on a declared service change with a short burn-in flagged as low confidence. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 97 |
| `hours` | 2016 |
| `events` | 290 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29188 |
| `naive_z.recall` | 0.53247 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 154 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.50864 |
| `seasonal_z.recall` | 0.80519 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 154 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.55586 |
| `seasonal_z_calendar.recall` | 0.96753 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 154 |

</details>
