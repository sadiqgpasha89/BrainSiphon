# Threat Actor Attribution & Campaign Clustering: worked example

> Run on synthetic data with `graph` engine, seed 70068, knobs {"n_clusters": 1930, "hub_share": 0.099}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels.

**Constraints that shape the design.** Evidence-based confidence statements; False-flag awareness; Analyst review

**Label in this use case.** For "Threat Actor Attribution & Campaign Clustering": Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ground truth is analyst opinion.

## 2. Choose the signals

Your strongest signal is **Infrastructure overlap** (shared IPs, certificates and registrants). Its rule: Time-bounded. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 43.7% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 4.16% and purity 79.3%, producing a cluster of 235 records. The weighted pair model links with precision 93.8% and purity 99.3%; its largest cluster is 14.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 4.2% |
| Pair precision, weighted model | 93.8% |
| Pair recall, weighted model | 84.9% |
| Cluster purity, weighted model | 99.3% |
| Largest cluster, rule versus model | 235 vs 14 |

## 5. An edge case from the blueprint

**Shared offensive tooling across unrelated actors.** shared offensive tooling merges unrelated actors into one cluster and creates a false attribution. Planned response: Tool-sharing priors and discounting of common frameworks. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Decide the cost of a wrong merge before you tune. Keep blocking, hub down-weighting and the review path for uncertain pairs.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `entities` | 3560 |
| `test_entities` | 1398 |
| `candidate_pairs_test` | 1888 |
| `hub_pairs_share` | 0.43697 |
| `any_shared_value.pair_precision` | 0.041598 |
| `any_shared_value.pair_recall` | 0.84916 |
| `any_shared_value.purity` | 0.79328 |
| `any_shared_value.largest_cluster` | 235 |
| `weighted_pair_model.pair_precision` | 0.93827 |
| `weighted_pair_model.pair_recall` | 0.84916 |
| `weighted_pair_model.purity` | 0.99285 |
| `weighted_pair_model.largest_cluster` | 14 |

</details>
