# Model Extraction & Abuse Detection for ML APIs: worked example

> Run on synthetic data with `anomaly` engine, seed 34107, knobs {"n_series": 61, "anomalies_per_series": 3.34}, in 9.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience.

**Constraints that shape the design.** Query-pattern analysis in real time; Legitimate bulk users; Low false positives

**Label in this use case.** For "Model Extraction & Abuse Detection for ML APIs": Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulated extraction attacks too naive.

## 2. Choose the signals

Your strongest signal is **Query-space coverage** (diversity and boundary-probing queries). Its rule: Embeddings. In the starter, the closest executable idea is **seasonal residual**: value minus the median of the same hour of the same weekday in previous weeks. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.

## 4. Baseline against the stronger design

The naive score finds 48.0% of events at 0.29 false alerts per series-week. The seasonal score finds 78.6% at 0.61. Adding the calendar finds 93.9% at 0.45.

| Result | Value |
|---|---|
| Recall, naive z-score | 48.0% |
| Recall, seasonal z-score | 78.6% |
| Recall, seasonal with calendar | 93.9% |
| False alerts per series-week, with calendar | 0.45 |
| Median detection delay, with calendar (hours) | 0.0 |

## 5. An edge case from the blueprint

**Legitimate research customer runs bulk queries.** flagged as extraction. Planned response: Customer tiers, contracts and explicit approval. Write the test that replays this case through your pipeline before you tune anything.

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
| `series` | 61 |
| `hours` | 2016 |
| `events` | 190 |
| `naive_z.threshold` | 2.5 |
| `naive_z.false_alerts_per_series_week` | 0.28667 |
| `naive_z.recall` | 0.47959 |
| `naive_z.median_delay_h` | 1 |
| `naive_z.events` | 98 |
| `seasonal_z.threshold` | 4.5 |
| `seasonal_z.false_alerts_per_series_week` | 0.6143 |
| `seasonal_z.recall` | 0.78571 |
| `seasonal_z.median_delay_h` | 0 |
| `seasonal_z.events` | 98 |
| `seasonal_z_calendar.threshold` | 3 |
| `seasonal_z_calendar.false_alerts_per_series_week` | 0.4539 |
| `seasonal_z_calendar.recall` | 0.93878 |
| `seasonal_z_calendar.median_delay_h` | 0 |
| `seasonal_z_calendar.events` | 98 |

</details>
