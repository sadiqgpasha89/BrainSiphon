# Provider Network Gap Identification: worked example

> Run on synthetic data with `cluster` engine, seed 18596, knobs {"n": 4940, "outlier_share": 0.019}, in 5.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact.

**Constraints that shape the design.** The network planning team validates candidate actions and the tool makes no contracting decision; Gaps are measured against versioned network rules; Member and population data are aggregated to geographic units that protect privacy

**Label in this use case.** For "Provider Network Gap Identification": Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using straight-line distance.

## 2. Choose the signals

Your strongest signal is **Unserved demand share** (demand outside the travel-time standard). Its rule: Demand and travel-time snapshot. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.202. Without a minimum segment size, k selection can spend a cluster on outliers (0.12% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.884 at the planted k. Choosing k by silhouette gives 5, and agreement 0.880: k is a decision about use, not a statistic. Bootstrap stability is 0.991.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.202 |
| Agreement, robust-scaled at the planted k | 0.884 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.991 |
| Smallest segment share | 11.4% |

## 5. An edge case from the blueprint

**Geographic barrier such as a river.** travel time is longer than distance. Planned response: Road-network routing. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.026 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 4940 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.2015 |
| `robust_scaled_ari_at_true_k` | 0.88388 |
| `chosen_k` | 5 |
| `robust_scaled_ari_at_chosen_k` | 0.87953 |
| `silhouette` | 0.36952 |
| `bootstrap_stability_ari` | 0.99121 |
| `smallest_segment_share` | 0.11417 |
| `unconstrained_k_smallest_share` | 0.0012146 |
| `segment_mix_shift_js` | 0.026351 |

</details>
