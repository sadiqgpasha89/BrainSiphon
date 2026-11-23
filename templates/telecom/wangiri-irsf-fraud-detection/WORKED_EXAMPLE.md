# Wangiri & Premium-Rate Fraud Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 7598, knobs {"n_series": 75, "anomalies_per_series": 2.087}, in 10.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue.

**Constraints that shape the design.** Alert within 5 minutes of the pattern starting; Blocks limited to destination ranges and approved templates; Genuine customers notified and given a way to appeal

**Label in this use case.** For "Wangiri & Premium-Rate Fraud Detection": Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Account blocks for call-back fraud.

## 2. Choose the signals

Your strongest signal is **Destination risk score** (fraud rate of the destination range from recent weeks). Its rule: Update daily. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 61.5% of events at 0.37 false alerts per series-week. The seasonal score finds 97.4% at 0.74. Adding the calendar finds 100.0% at 0.61.

| Result | Value |
|---|---|
| Recall, naive z-score | 61.5% |
| Recall, seasonal z-score | 97.4% |
| Recall, seasonal with calendar | 100.0% |
| False alerts per series-week, with calendar | 0.61 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**New fraud destination.** the new range has no risk score. Planned response: Anomaly features on destination novelty. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 75 |
| `hours` | 2016 |
| `events` | 167 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.36917 |
| `naive_z.recall` | 0.61538 |
| `naive_z.median_delay_h` | 0.5 |
| `naive_z.events` | 78 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.73556 |
| `seasonal_z.recall` | 0.97436 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 78 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.61343 |
| `seasonal_z_calendar.recall` | 1 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 78 |

</details>
