# Cross-Device Graph for Measurement: worked example

> Run on synthetic data with `graph` engine, seed 47311, knobs {"n_clusters": 1490, "hub_share": 0.126}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Link devices belonging to the same person or household to unify reach, frequency and attribution measurement.

**Constraints that shape the design.** Privacy law compliance; Probabilistic links labelled as such; Quality metrics per link type

**Label in this use case.** For "Cross-Device Graph for Measurement": Link devices belonging to the same person or household to unify reach, frequency and attribution measurement. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on deterministic links only.

## 2. Choose the signals

Your strongest signal is **Shared login events** (authenticated co-occurrence). Its rule: Hashing. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 49.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 8.47% and purity 78.0%, producing a cluster of 92 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 8.5% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 81.4% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 92 vs 9 |

## 5. An edge case from the blueprint

**Large shared networks (offices).** large shared networks merge unrelated devices into mega-clusters that wreck frequency counts. Planned response: Cluster size caps and edge down-weighting. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2734 |
| `test_entities` | 1053 |
| `candidate_pairs_test` | 1425 |
| `hub_pairs_share` | 0.49474 |
| `any_shared_value.pair_precision` | 0.084703 |
| `any_shared_value.pair_recall` | 0.81377 |
| `any_shared_value.purity` | 0.77968 |
| `any_shared_value.largest_cluster` | 92 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.81377 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
