# Market Regime Detection: worked example

> Run on synthetic data with `cluster` engine, seed 59632, knobs {"n": 6750, "outlier_share": 0.009}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound.

**Constraints that shape the design.** Decision lag under 1 day; Interpretable regime labels; Low false switching

**Label in this use case.** For "Market Regime Detection": Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using smoothed state probabilities in backtests.

## 2. Choose the signals

Your strongest signal is **Realised vs implied vol spread** (20d realised vol minus implied vol). Its rule: Align timestamps across sources. In the starter, the closest executable idea is **value feature (f0)**: in currency units, thousands of times larger than the others. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is 0.150. Without a minimum segment size, k selection can spend a cluster on outliers (18.36% of rows).

## 4. Baseline against the stronger design

Robust scaling and winsorising lift agreement to 0.943 at the planted k. Choosing k by silhouette gives 4, and agreement 0.773: k is a decision about use, not a statistic. Bootstrap stability is 0.936.

| Result | Value |
|---|---|
| Agreement with planted segments, unscaled | 0.150 |
| Agreement, robust-scaled at the planted k | 0.943 |
| k chosen from data (planted: 6) | 4 |
| Bootstrap stability | 0.936 |
| Smallest segment share | 18.4% |

## 5. An edge case from the blueprint

**Flash crash day.** model flips regime on one print. Planned response: Minimum dwell time and robust features. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 6750 |
| `true_segments` | 6 |
| `unscaled_ari` | 0.14969 |
| `robust_scaled_ari_at_true_k` | 0.94276 |
| `chosen_k` | 4 |
| `robust_scaled_ari_at_chosen_k` | 0.77312 |
| `silhouette` | 0.36165 |
| `bootstrap_stability_ari` | 0.93603 |
| `smallest_segment_share` | 0.18356 |
| `unconstrained_k_smallest_share` | 0.18356 |
| `segment_mix_shift_js` | 0.026101 |

</details>
