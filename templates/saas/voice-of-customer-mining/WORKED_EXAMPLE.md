# Voice-of-Customer Mining: worked example

> Run on synthetic data with `cluster` engine, seed 40443, knobs {"n": 4580, "outlier_share": 0.01}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact.

**Constraints that shape the design.** Multi-source dedup; PII handling; Theme stability

**Label in this use case.** For "Voice-of-Customer Mining": Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mention counts as importance.

## 2. Choose the signals

Your strongest signal is **Theme volume trend** (mentions over time). Its rule: Taxonomy. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.362. Without a minimum segment size, k selection can spend a cluster on outliers (0.15% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.907 at the planted k. Choosing k by silhouette gives 5, and agreement 0.905: k is a decision about use, not a statistic. Bootstrap stability is 0.994.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.362 |
| Agreement, robust-scaled at the planted k | 0.907 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.994 |
| Smallest segment share | 10.8% |

## 5. An edge case from the blueprint

**Taxonomy drift as product changes.** themes drift as the product changes, so trend lines break and comparisons become meaningless. Planned response: Versioned taxonomy and mapping tables. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.022 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 4580 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.36211 |
| `robust_scaled_ari_at_true_k` | 0.90658 |
| `chosen_k` | 5 |
| `robust_scaled_ari_at_chosen_k` | 0.90495 |
| `silhouette` | 0.45208 |
| `bootstrap_stability_ari` | 0.99436 |
| `smallest_segment_share` | 0.10808 |
| `unconstrained_k_smallest_share` | 0.0015284 |
| `segment_mix_shift_js` | 0.022311 |

</details>
