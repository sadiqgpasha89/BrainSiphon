# Application Rationalisation Analysis: worked example

> Run on synthetic data with `cluster` engine, seed 63682, knobs {"n": 5970, "outlier_share": 0.008}, in 1.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.

**Constraints that shape the design.** Owners decide every retirement; Each recommendation shows use, cost and dependencies; Data protection and retention checked

**Label in this use case.** For "Application Rationalisation Analysis": Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age as the criterion.

## 2. Choose the signals

Your strongest signal is **Usage trend** (active users and transactions). Its rule: From usage data. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.144. Without a minimum segment size, k selection can spend a cluster on outliers (10.39% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.839 at the planted k. Choosing k by silhouette gives 4, and agreement 0.669: k is a decision about use, not a statistic. Bootstrap stability is 0.967.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.144 |
| Agreement, robust-scaled at the planted k | 0.839 |
| k chosen from data (planted: 6) | 4 |
| Bootstrap stability | 0.967 |
| Smallest segment share | 10.4% |

## 5. An edge case from the blueprint

**Shadow IT.** unregistered applications exist. Planned response: Discovery from network and expense data. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.021 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 5970 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.14385 |
| `robust_scaled_ari_at_true_k` | 0.83945 |
| `chosen_k` | 4 |
| `robust_scaled_ari_at_chosen_k` | 0.66877 |
| `silhouette` | 0.44133 |
| `bootstrap_stability_ari` | 0.96671 |
| `smallest_segment_share` | 0.10385 |
| `unconstrained_k_smallest_share` | 0.10385 |
| `segment_mix_shift_js` | 0.020866 |

</details>
