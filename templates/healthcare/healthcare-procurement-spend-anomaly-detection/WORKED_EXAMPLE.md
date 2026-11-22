# Healthcare Procurement Spend Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 59886, knobs {"n_series": 82, "anomalies_per_series": 2.307}, in 29.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it.

**Constraints that shape the design.** Rules and robust anomaly models rank exceptions and procurement or finance reviews before any hold or supplier action; Units of measure, currencies, tax and item equivalence are normalised before comparison; Every exception shows the expected value, the actual value and the evidence

**Label in this use case.** For "Healthcare Procurement Spend Anomaly Detection": Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Comparing unnormalised units.

## 2. Choose the signals

Your strongest signal is **Unit-price deviation** (invoiced unit price versus contract or trailing median price). Its rule: Use normalised units and the price at the order date. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 54.4% of events at 0.30 false alerts per series-week. The seasonal score finds 86.7% at 0.68. Adding the calendar finds 94.4% at 0.52.

| Result | Value |
|---|---|
| Recall, naive z-score | 54.4% |
| Recall, seasonal z-score | 86.7% |
| Recall, seasonal with calendar | 94.4% |
| False alerts per series-week, with calendar | 0.52 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Unit-of-measure change.** a price jumps tenfold. Planned response: Unit conversion tables with change detection. Write the test that replays this case through your pipeline before you tune anything.

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
| `events` | 195 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29957 |
| `naive_z.recall` | 0.54444 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 90 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.67531 |
| `seasonal_z.recall` | 0.86667 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 90 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.52045 |
| `seasonal_z_calendar.recall` | 0.94444 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 90 |

</details>
