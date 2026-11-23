# Flaky Test Detection and Quarantine: worked example

> Run on synthetic data with `anomaly` engine, seed 13629, knobs {"n_series": 60, "anomalies_per_series": 2.787}, in 15.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines.

**Constraints that shape the design.** Flaky classification with evidence from reruns; Quarantine with an owner and a deadline; Quarantined tests still run and report

**Label in this use case.** For "Flaky Test Detection and Quarantine": Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Silent skips.

## 2. Choose the signals

Your strongest signal is **Pass-fail flip rate on same commit** (outcome changes without code change). Its rule: From CI. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 61.9% of events at 0.30 false alerts per series-week. The seasonal score finds 89.3% at 0.65. Adding the calendar finds 95.2% at 0.55.

| Result | Value |
|---|---|
| Recall, naive z-score | 61.9% |
| Recall, seasonal z-score | 89.3% |
| Recall, seasonal with calendar | 95.2% |
| False alerts per series-week, with calendar | 0.55 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Infrastructure outage.** many tests fail at once. Planned response: Outage correlation to avoid false flakes. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 60 |
| `hours` | 2016 |
| `events` | 150 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.30186 |
| `naive_z.recall` | 0.61905 |
| `naive_z.median_delay_h` | 3 |
| `naive_z.events` | 84 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.64535 |
| `seasonal_z.recall` | 0.89286 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 84 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.5482 |
| `seasonal_z_calendar.recall` | 0.95238 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 84 |

</details>
