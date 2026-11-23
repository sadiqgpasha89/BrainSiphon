# Physician Availability & Schedule Conflict Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 87915, knobs {"n_series": 96, "anomalies_per_series": 1.927}, in 31.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage.

**Constraints that shape the design.** The scheduling office confirms every change and any patient communication; Conflicts are found by deterministic temporal and spatial checks and not by a model; Resolutions are proposals that list affected appointments

**Label in this use case.** For "Physician Availability & Schedule Conflict Detection": Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using a model for logical conflicts.

## 2. Choose the signals

Your strongest signal is **Overlap duration** (minutes of overlap between commitments). Its rule: Event times. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 51.5% of events at 0.27 false alerts per series-week. The seasonal score finds 89.1% at 0.68. Adding the calendar finds 97.0% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 51.5% |
| Recall, seasonal z-score | 89.1% |
| Recall, seasonal with calendar | 97.0% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Time zone difference between systems.** false overlaps appear between systems. Planned response: Single time standard on ingest. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 96 |
| `hours` | 2016 |
| `events` | 189 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.26673 |
| `naive_z.recall` | 0.51485 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 101 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.68092 |
| `seasonal_z.recall` | 0.89109 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 101 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.53346 |
| `seasonal_z_calendar.recall` | 0.9703 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 101 |

</details>
