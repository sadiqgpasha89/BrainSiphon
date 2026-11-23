# Error Grouping and Log Clustering: worked example

> Run on synthetic data with `cluster` engine, seed 19659, knobs {"n": 5180, "outlier_share": 0.006}, in 1.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events.

**Constraints that shape the design.** Grouping within 10 s of arrival; Group stability across releases; Personal data removed from messages

**Label in this use case.** For "Error Grouping and Log Clustering": Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Exact message grouping.

## 2. Choose the signals

Your strongest signal is **Normalised stack trace** (frames without variable parts). Its rule: From parsing. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.243. Without a minimum segment size, k selection can spend a cluster on outliers (10.41% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.970 at the planted k. Choosing k by silhouette gives 5, and agreement 0.908: k is a decision about use, not a statistic. Bootstrap stability is 0.955.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.243 |
| Agreement, robust-scaled at the planted k | 0.970 |
| k chosen from data (planted: 6) | 5 |
| Bootstrap stability | 0.955 |
| Smallest segment share | 10.4% |

## 5. An edge case from the blueprint

**Renamed functions.** traces change after refactors. Planned response: Fuzzy frame matching. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS 0.024 in the last period), and refit on a schedule.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 5180 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.24265 |
| `robust_scaled_ari_at_true_k` | 0.97049 |
| `chosen_k` | 5 |
| `robust_scaled_ari_at_chosen_k` | 0.90846 |
| `silhouette` | 0.40176 |
| `bootstrap_stability_ari` | 0.95548 |
| `smallest_segment_share` | 0.10405 |
| `unconstrained_k_smallest_share` | 0.10405 |
| `segment_mix_shift_js` | 0.024384 |

</details>
