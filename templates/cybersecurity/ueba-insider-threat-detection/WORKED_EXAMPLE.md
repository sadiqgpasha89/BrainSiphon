# UEBA: Insider Threat Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 88784, knobs {"n_series": 82, "anomalies_per_series": 2.34}, in 12.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts.

**Constraints that shape the design.** Privacy and works-council constraints; Explainability for investigators; Peer-group baselines

**Label in this use case.** For "UEBA: Insider Threat Detection": Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Very few true insider labels.

## 2. Choose the signals

Your strongest signal is **Peer-relative deviation** (z-score of activity vs peer group). Its rule: Peer group definition. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 53.7% of events at 0.29 false alerts per series-week. The seasonal score finds 80.1% at 0.60. Adding the calendar finds 96.3% at 0.47.

| Result | Value |
|---|---|
| Recall, naive z-score | 53.7% |
| Recall, seasonal z-score | 80.1% |
| Recall, seasonal with calendar | 96.3% |
| False alerts per series-week, with calendar | 0.47 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Reorganisation changes peer groups.** everyone's baseline shifts. Planned response: Org-change events trigger baseline refresh. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 213 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28688 |
| `naive_z.recall` | 0.53676 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 136 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.60423 |
| `seasonal_z.recall` | 0.80147 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 136 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.47221 |
| `seasonal_z_calendar.recall` | 0.96324 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 136 |

</details>
