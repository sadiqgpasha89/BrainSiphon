# Wearable Arrhythmia Detection (ECG/PPG): worked example

> Run on synthetic data with `anomaly` engine, seed 11580, knobs {"n_series": 106, "anomalies_per_series": 3.013}, in 14.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain.

**Constraints that shape the design.** On-device inference under 1 mW budget; Motion artefacts; Regulatory clearance

**Label in this use case.** For "Wearable Arrhythmia Detection (ECG/PPG)": Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test data from clean lab recordings.

## 2. Choose the signals

Your strongest signal is **RR-interval irregularity** (beat-to-beat interval entropy). Its rule: Peak detection quality. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 53.0% of events at 0.25 false alerts per series-week. The seasonal score finds 85.2% at 0.55. Adding the calendar finds 96.0% at 0.50.

| Result | Value |
|---|---|
| Recall, naive z-score | 53.0% |
| Recall, seasonal z-score | 85.2% |
| Recall, seasonal with calendar | 96.0% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Tremor or exercise motion.** false AF alerts. Planned response: Activity-aware gating and confirmation window. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 106 |
| `hours` | 2016 |
| `events` | 301 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.25335 |
| `naive_z.recall` | 0.5302 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 149 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.54598 |
| `seasonal_z.recall` | 0.85235 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 149 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50473 |
| `seasonal_z_calendar.recall` | 0.95973 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 149 |

</details>
