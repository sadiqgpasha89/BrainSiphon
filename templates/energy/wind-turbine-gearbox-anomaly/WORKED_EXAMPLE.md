# Wind Turbine Gearbox Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 47199, knobs {"n_series": 87, "anomalies_per_series": 3.113}, in 10.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures.

**Constraints that shape the design.** Baselines per turbine and operating state; False alarms under 1 per turbine per quarter; Alerts include the component and trend

**Label in this use case.** For "Wind Turbine Gearbox Anomaly Detection": Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Global alarm limits.

## 2. Choose the signals

Your strongest signal is **Gearbox temperature residual** (difference between measured and expected temperature). Its rule: State-conditioned. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 56.0% of events at 0.29 false alerts per series-week. The seasonal score finds 84.0% at 0.60. Adding the calendar finds 94.7% at 0.51.

| Result | Value |
|---|---|
| Recall, naive z-score | 56.0% |
| Recall, seasonal z-score | 84.0% |
| Recall, seasonal with calendar | 94.7% |
| False alerts per series-week, with calendar | 0.51 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Curtailment.** operating state is unusual for weeks. Planned response: State-aware baselines. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 87 |
| `hours` | 2016 |
| `events` | 302 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28954 |
| `naive_z.recall` | 0.56 |
| `naive_z.median_delay_h` | 2.5 |
| `naive_z.events` | 150 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.59582 |
| `seasonal_z.recall` | 0.84 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 150 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50729 |
| `seasonal_z_calendar.recall` | 0.94667 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 150 |

</details>
