# Identity Resolution in a Cookieless World: worked example

> Run on synthetic data with `graph` engine, seed 83265, knobs {"n_clusters": 1720, "hub_share": 0.09}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability.

**Constraints that shape the design.** Consent and privacy law; Deterministic and probabilistic linking; Fraud resistance

**Label in this use case.** For "Identity Resolution in a Cookieless World": Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on deterministic links that inflate probabilistic accuracy.

## 2. Choose the signals

Your strongest signal is **Deterministic link strength** (shared login or hashed email). Its rule: Hash salting. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 39.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 5.47% and purity 80.9%, producing a cluster of 179 records. The weighted pair model links with precision 90.2% and purity 98.9%; its largest cluster is 16.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 5.5% |
| Pair precision, weighted model | 90.2% |
| Pair recall, weighted model | 83.6% |
| Cluster purity, weighted model | 98.9% |
| Largest cluster, rule versus model | 179 vs 16 |

## 5. An edge case from the blueprint

**Public WiFi merges unrelated users.** giant false clusters. Planned response: Down-weight high-degree shared signals. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3146 |
| `test_entities` | 1211 |
| `candidate_pairs_test` | 1435 |
| `hub_pairs_share` | 0.39512 |
| `any_shared_value.pair_precision` | 0.054742 |
| `any_shared_value.pair_recall` | 0.83649 |
| `any_shared_value.purity` | 0.80925 |
| `any_shared_value.largest_cluster` | 179 |
| `weighted_pair_model.pair_precision` | 0.90158 |
| `weighted_pair_model.pair_recall` | 0.83563 |
| `weighted_pair_model.purity` | 0.98927 |
| `weighted_pair_model.largest_cluster` | 16 |

</details>
