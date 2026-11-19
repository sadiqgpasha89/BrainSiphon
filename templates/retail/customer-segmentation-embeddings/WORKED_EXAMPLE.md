# Behavioural Customer Segmentation with Embeddings: worked example

> Run on synthetic data with `cluster` engine, seed 3629, knobs {"n": 5720, "outlier_share": 0.012}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.

**Constraints that shape the design.** Stable segments month to month; Interpretable profiles; Privacy-safe aggregates

**Label in this use case.** For "Behavioural Customer Segmentation with Embeddings": Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating clusters only on internal metrics.

## 2. Choose the signals

Your strongest signal is **Sequence embedding of purchases** (transformer over order sequences). Its rule: Fixed observation window. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.187. Without a minimum segment size, k selection can spend a cluster on outliers (11.03% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.958 at the planted k. Choosing k by silhouette gives 5, and agreement 0.892: k is a decision about use, not a statistic. Bootstrap stability is 0.953.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.187 |
| Agreement, robust-scaled at the planted k | 0.958 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.953 |
| Smallest segment share | 11.0% |

## 5. An edge case from the blueprint

**Segment drift after new product launch.** segment assignments shift after launch so campaigns and reports silently break. Planned response: Alignment of new clusters to old via optimal transport. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.023 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 5720 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.18745 |
| `robust_scaled_ari_at_true_k` | 0.95849 |
| `chosen_k` | 5 |
| `robust_scaled_ari_at_chosen_k` | 0.89216 |
| `silhouette` | 0.46606 |
| `bootstrap_stability_ari` | 0.95324 |
| `smallest_segment_share` | 0.11031 |
| `unconstrained_k_smallest_share` | 0.11031 |
| `segment_mix_shift_js` | 0.023453 |

</details>
