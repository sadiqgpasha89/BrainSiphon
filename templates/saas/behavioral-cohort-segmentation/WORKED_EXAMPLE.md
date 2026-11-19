# Behavioural Cohorts & User Segmentation: worked example

> Run on synthetic data with `cluster` engine, seed 41585, knobs {"n": 6450, "outlier_share": 0.02}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions.

**Constraints that shape the design.** Stable segments; Explainable definitions; Privacy

**Label in this use case.** For "Behavioural Cohorts & User Segmentation": Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Internal metrics only.

## 2. Choose the signals

Your strongest signal is **Feature-usage embedding** (sequence embedding of actions). Its rule: Window. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.264. Without a minimum segment size, k selection can spend a cluster on outliers (0.29% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.888 at the planted k. Choosing k by silhouette gives 5, and agreement 0.886: k is a decision about use, not a statistic. Bootstrap stability is 0.991.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.264 |
| Agreement, robust-scaled at the planted k | 0.888 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.991 |
| Smallest segment share | 10.5% |

## 5. An edge case from the blueprint

**Product redesign changes event semantics.** a product redesign changes what events mean, so existing segments silently break. Planned response: Event-contract versioning and re-mapping. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.028 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 6450 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.26372 |
| `robust_scaled_ari_at_true_k` | 0.88826 |
| `chosen_k` | 5 |
| `robust_scaled_ari_at_chosen_k` | 0.88635 |
| `silhouette` | 0.43894 |
| `bootstrap_stability_ari` | 0.99109 |
| `smallest_segment_share` | 0.10512 |
| `unconstrained_k_smallest_share` | 0.0029457 |
| `segment_mix_shift_js` | 0.028122 |

</details>
