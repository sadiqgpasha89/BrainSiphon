# Privileged Access Session Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 42850, knobs {"n_series": 100, "anomalies_per_series": 2.22}, in 5.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time.

**Constraints that shape the design.** Real-time command analysis; Admin productivity; Session recording privacy

**Label in this use case.** For "Privileged Access Session Anomaly Detection": Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lab attack sessions are too clean.

## 2. Choose the signals

Your strongest signal is **Command risk embedding** (embedding of command and arguments). Its rule: Tokenisation. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 47.0% of events at 0.31 false alerts per series-week. The seasonal score finds 86.1% at 0.67. Adding the calendar finds 97.4% at 0.51.

| Result | Value |
|---|---|
| Recall, naive z-score | 47.0% |
| Recall, seasonal z-score | 86.1% |
| Recall, seasonal with calendar | 97.4% |
| False alerts per series-week, with calendar | 0.51 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Incident response changes admin behaviour dramatically.** false alerts during emergencies. Planned response: Break-glass mode with heightened logging not blocking. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 239 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.31019 |
| `naive_z.recall` | 0.46957 |
| `naive_z.median_delay_h` | 1.5 |
| `naive_z.events` | 115 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.67242 |
| `seasonal_z.recall` | 0.86087 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 115 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50587 |
| `seasonal_z_calendar.recall` | 0.97391 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 115 |

</details>
