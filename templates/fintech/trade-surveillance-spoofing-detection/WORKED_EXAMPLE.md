# Trade Surveillance: Spoofing & Layering Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 35647, knobs {"n_series": 113, "anomalies_per_series": 2.333}, in 6.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues.

**Constraints that shape the design.** Sub-100ms detection of live patterns; Evidence preserved at message level; Low false positives against legitimate market makers

**Label in this use case.** For "Trade Surveillance: Spoofing & Layering Detection": Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled cases drawn from enforcement bias.

## 2. Choose the signals

Your strongest signal is **Opposite-side execution after cancel** (execution on side B within 500 ms of cancelling side A). Its rule: Use exchange sequence numbers. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 50.0% of events at 0.32 false alerts per series-week. The seasonal score finds 86.3% at 0.75. Adding the calendar finds 95.2% at 0.47.

| Result | Value |
|---|---|
| Recall, naive z-score | 50.0% |
| Recall, seasonal z-score | 86.3% |
| Recall, seasonal with calendar | 95.2% |
| False alerts per series-week, with calendar | 0.47 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Venue sends corrected sequence numbers.** patterns misaligned. Planned response: Sequence repair and reorder buffer. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 113 |
| `hours` | 2016 |
| `events` | 245 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.31503 |
| `naive_z.recall` | 0.5 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 124 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.75165 |
| `seasonal_z.recall` | 0.8629 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 124 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.47347 |
| `seasonal_z_calendar.recall` | 0.95161 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 124 |

</details>
