# Vendor Access Risk Prediction: worked example

> Run on synthetic data with `anomaly` engine, seed 28161, knobs {"n_series": 71, "anomalies_per_series": 2.8}, in 22.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation.

**Constraints that shape the design.** A strict allow-list and policy rules decide violations and anomaly models are supplemental; No automatic accusation or punitive action and security staff investigate; Alerts explain which pattern was unusual and the baseline

**Label in this use case.** For "Vendor Access Risk Prediction": Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on investigated cases only.

## 2. Choose the signals

Your strongest signal is **Time and zone deviation** (distance of a visit from the vendor's usual time and zones). Its rule: Baselines from earlier periods. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 52.3% of events at 0.32 false alerts per series-week. The seasonal score finds 84.9% at 0.61. Adding the calendar finds 96.5% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 52.3% |
| Recall, seasonal z-score | 84.9% |
| Recall, seasonal with calendar | 96.5% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**New vendor.** no baseline. Planned response: Peer-group baseline with low confidence. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 71 |
| `hours` | 2016 |
| `events` | 186 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.32253 |
| `naive_z.recall` | 0.52326 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 86 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.60987 |
| `seasonal_z.recall` | 0.84884 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 86 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.52484 |
| `seasonal_z_calendar.recall` | 0.96512 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 86 |

</details>
