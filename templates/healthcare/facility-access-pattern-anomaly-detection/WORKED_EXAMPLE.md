# Facility Access Pattern Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 16002, knobs {"n_series": 90, "anomalies_per_series": 1.867}, in 31.6 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first.

**Constraints that shape the design.** Hard policy checks run first and anomaly findings never decide a violation; Security triages and the system never sanctions anyone; Privacy, retention and labour-policy safeguards apply and findings are minimised and role-based

**Label in this use case.** For "Facility Access Pattern Anomaly Detection": Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating anomalies as violations.

## 2. Choose the signals

Your strongest signal is **Path novelty** (whether the zone sequence is unseen for the identity and role). Its rule: Past paths. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 57.0% of events at 0.33 false alerts per series-week. The seasonal score finds 94.9% at 0.80. Adding the calendar finds 98.7% at 0.59.

| Result | Value |
|---|---|
| Recall, naive z-score | 57.0% |
| Recall, seasonal z-score | 94.9% |
| Recall, seasonal with calendar | 98.7% |
| False alerts per series-week, with calendar | 0.59 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Reorganisation changes roles.** baselines mislead. Planned response: Role versioning and a re-baseline window. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 90 |
| `hours` | 2016 |
| `events` | 162 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32615 |
| `naive_z.recall` | 0.56962 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 79 |
| `seasonal_z.threshold` | 4 |
| `seasonal_z.false_alerts_per_series_week` | 0.7957 |
| `seasonal_z.recall` | 0.94937 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 79 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.59447 |
| `seasonal_z_calendar.recall` | 0.98734 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 79 |

</details>
