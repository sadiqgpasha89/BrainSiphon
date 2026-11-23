# Vibration Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 31604, knobs {"n_series": 99, "anomalies_per_series": 3.48}, in 20.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure.

**Constraints that shape the design.** Per-asset baselines by operating state; Alarm false rate under 1 per asset per month; Explanation by frequency band

**Label in this use case.** For "Vibration Anomaly Detection": Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: One threshold for all states.

## 2. Choose the signals

Your strongest signal is **Band energy ratio** (energy in the bearing and gear bands against the baseline). Its rule: Per machine type. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 55.5% of events at 0.29 false alerts per series-week. The seasonal score finds 93.1% at 0.72. Adding the calendar finds 94.2% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 55.5% |
| Recall, seasonal z-score | 93.1% |
| Recall, seasonal with calendar | 94.2% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Process change.** normal behaviour changes. Planned response: State clustering and baseline refresh on approved changes. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 99 |
| `hours` | 2016 |
| `events` | 338 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28598 |
| `naive_z.recall` | 0.55491 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 173 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.72337 |
| `seasonal_z.recall` | 0.93064 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 173 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.51729 |
| `seasonal_z_calendar.recall` | 0.9422 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 173 |

</details>
