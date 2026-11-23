# Usage & Rating Revenue Leakage Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 56197, knobs {"n_series": 63, "anomalies_per_series": 3.48}, in 10.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause.

**Constraints that shape the design.** Reconciliation across network, mediation and billing counts; Findings linked to a process step for root cause; Evidence pack for finance sign-off

**Label in this use case.** For "Usage & Rating Revenue Leakage Detection": Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using total bill checks only.

## 2. Choose the signals

Your strongest signal is **Record count ratio between steps** (records in versus out per day and service). Its rule: Align on the same period. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 46.6% of events at 0.19 false alerts per series-week. The seasonal score finds 75.4% at 0.41. Adding the calendar finds 95.8% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 46.6% |
| Recall, seasonal z-score | 75.4% |
| Recall, seasonal with calendar | 95.8% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Product launch.** volumes jump without history. Planned response: Launch calendar and a looser baseline for new products. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 63 |
| `hours` | 2016 |
| `events` | 232 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.18505 |
| `naive_z.recall` | 0.4661 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 118 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.41305 |
| `seasonal_z.recall` | 0.75424 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 118 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.5254 |
| `seasonal_z_calendar.recall` | 0.95763 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 118 |

</details>
