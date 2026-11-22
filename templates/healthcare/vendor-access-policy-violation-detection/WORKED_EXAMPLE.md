# Vendor Access Policy Violation Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 62236, knobs {"n_series": 116, "anomalies_per_series": 2.707}, in 28.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff.

**Constraints that shape the design.** A deterministic policy engine decides violations and anomaly models are supplemental only; Security personnel review and respond and the system takes no sanction or denial itself; Every violation shows the rule, the event timeline and the authorisation in force

**Label in this use case.** For "Vendor Access Policy Violation Detection": Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting an anomaly model define a violation.

## 2. Choose the signals

Your strongest signal is **Authorisation mismatch** (access outside the approved window, area or purpose). Its rule: Authorisations as at the event. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 58.0% of events at 0.25 false alerts per series-week. The seasonal score finds 88.3% at 0.65. Adding the calendar finds 97.5% at 0.51.

| Result | Value |
|---|---|
| Recall, naive z-score | 58.0% |
| Recall, seasonal z-score | 88.3% |
| Recall, seasonal with calendar | 97.5% |
| False alerts per series-week, with calendar | 0.51 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Clock skew between systems.** events look out of order. Planned response: Time synchronisation checks and tolerance windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 116 |
| `hours` | 2016 |
| `events` | 315 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.24946 |
| `naive_z.recall` | 0.58025 |
| `naive_z.median_delay_h` | 1.5 |
| `naive_z.events` | 162 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.65145 |
| `seasonal_z.recall` | 0.88272 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 162 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50788 |
| `seasonal_z_calendar.recall` | 0.97531 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 162 |

</details>
