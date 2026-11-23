# Field Failure Early Warning: worked example

> Run on synthetic data with `anomaly` engine, seed 83778, knobs {"n_series": 74, "anomalies_per_series": 2.32}, in 17.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them.

**Constraints that shape the design.** Alert when a failure mode exceeds the expected rate with a confidence level; Evidence pack for engineering; Privacy rules for customer data

**Label in this use case.** For "Field Failure Early Warning": Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw counts.

## 2. Choose the signals

Your strongest signal is **Failure rate versus expected** (observed to expected ratio by variant and age). Its rule: Exposure adjusted. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 41.0% of events at 0.32 false alerts per series-week. The seasonal score finds 72.3% at 0.52. Adding the calendar finds 96.4% at 0.53.

| Result | Value |
|---|---|
| Recall, naive z-score | 41.0% |
| Recall, seasonal z-score | 72.3% |
| Recall, seasonal with calendar | 96.4% |
| False alerts per series-week, with calendar | 0.53 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Firmware release.** fault codes change meaning. Planned response: Firmware-aware code maps. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 74 |
| `hours` | 2016 |
| `events` | 169 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32071 |
| `naive_z.recall` | 0.40964 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 83 |
| `seasonal_z.threshold` | 5.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.52045 |
| `seasonal_z.recall` | 0.72289 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 83 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.52607 |
| `seasonal_z_calendar.recall` | 0.96386 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 83 |

</details>
