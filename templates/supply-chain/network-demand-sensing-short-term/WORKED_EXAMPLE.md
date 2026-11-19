# Short-Term Demand Sensing: worked example

> Run on synthetic data with Hand-written starter, in 16.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.

**Constraints that shape the design.** Nightly refresh for 5M series; Latency of POS feeds; Hierarchical consistency

**Label in this use case.** For "Short-Term Demand Sensing": Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training with signals that arrive after the forecast time.

## 2. Choose the signals

Your strongest signal is **Open order book** (confirmed orders not yet shipped by SKU). Its rule: Take the snapshot as it stood at forecast time. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| rows | 27269 |
| h1.wmape_model | 0.1164 |
| h1.wmape_baseline | 0.2035 |
| h1.fva | 0.428 |
| h3.wmape_model | 0.1159 |
| h3.wmape_baseline | 0.2023 |

## 5. An edge case from the blueprint

**POS feed arrives late for a region.** the model reads a missing day as zero demand. Planned response: Feed-completeness check per partner and imputation with confidence flags. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 27269 |
| `h1.wmape_model` | 0.11639 |
| `h1.wmape_baseline` | 0.20348 |
| `h1.fva` | 0.42801 |
| `h3.wmape_model` | 0.11592 |
| `h3.wmape_baseline` | 0.2023 |
| `h3.fva` | 0.42697 |
| `h7.wmape_model` | 0.1181 |
| `h7.wmape_baseline` | 0.20655 |
| `h7.fva` | 0.42821 |
| `h14.wmape_model` | 0.14308 |
| `h14.wmape_baseline` | 0.22251 |
| `h14.fva` | 0.35697 |
| `p90_coverage` | 0.88958 |
| `wmape_sku_level` | 0.12301 |
| `wmape_aggregate` | 0.025932 |
| `late_feed.missing_as_zero` | 0.19779 |
| `late_feed.missing_as_nan` | 0.14142 |

</details>
