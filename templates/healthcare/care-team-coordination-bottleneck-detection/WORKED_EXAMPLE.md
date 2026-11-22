# Care-Team Coordination Bottleneck Detection: worked example

> Run on synthetic data with `anomaly` engine, seed 17050, knobs {"n_series": 67, "anomalies_per_series": 2.787}, in 26.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected.

**Constraints that shape the design.** Process owners validate findings and redesign workflows and the analytics change no workflow; Results are aggregated to pathways, stages and teams and are not used to rate individuals; Service-level definitions are versioned and agreed with owners

**Label in this use case.** For "Care-Team Coordination Bottleneck Detection": Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reading associations as causes.

## 2. Choose the signals

Your strongest signal is **Stage waiting time** (time between handoff and the next action for each stage). Its rule: Event timestamps. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 52.8% of events at 0.26 false alerts per series-week. The seasonal score finds 77.5% at 0.46. Adding the calendar finds 97.8% at 0.50.

| Result | Value |
|---|---|
| Recall, naive z-score | 52.8% |
| Recall, seasonal z-score | 77.5% |
| Recall, seasonal with calendar | 97.8% |
| False alerts per series-week, with calendar | 0.50 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Missing timestamps.** stages look shorter or longer. Planned response: Completeness checks and exclusion rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 67 |
| `hours` | 2016 |
| `events` | 178 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.261 |
| `naive_z.recall` | 0.52809 |
| `naive_z.median_delay_h` | 0 |
| `naive_z.events` | 89 |
| `seasonal_z.threshold` | 5 |
| `seasonal_z.false_alerts_per_series_week` | 0.45986 |
| `seasonal_z.recall` | 0.77528 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 89 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.50025 |
| `seasonal_z_calendar.recall` | 0.97753 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 89 |

</details>
