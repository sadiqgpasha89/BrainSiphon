# IoT Device Anomaly Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 79287, knobs {"n_series": 101, "anomalies_per_series": 3.147}, in 12.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways.

**Constraints that shape the design.** Gateway CPU limits; Millions of device types; Intermittent connectivity

**Label in this use case.** For "IoT Device Anomaly Detection": Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Injected attacks unlike real botnets.

## 2. Choose the signals

Your strongest signal is **Destination set deviation** (new endpoints contacted). Its rule: Device profile. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 55.6% of events at 0.30 false alerts per series-week. The seasonal score finds 90.6% at 0.69. Adding the calendar finds 95.0% at 0.50.

| Result | Value |
|---|---|
| Recall, naive z-score | 55.6% |
| Recall, seasonal z-score | 90.6% |
| Recall, seasonal with calendar | 95.0% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Firmware update changes behaviour.** flagged as anomalous. Planned response: Update-window awareness with profile refresh. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 101 |
| `hours` | 2016 |
| `events` | 329 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.29681 |
| `naive_z.recall` | 0.55625 |
| `naive_z.median_delay_h` | 2 |
| `naive_z.events` | 160 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.69462 |
| `seasonal_z.recall` | 0.90625 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 160 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50293 |
| `seasonal_z_calendar.recall` | 0.95 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 160 |

</details>
