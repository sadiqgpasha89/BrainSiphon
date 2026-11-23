# Part Master Deduplication: worked example

> Run on synthetic data with `graph` engine, seed 83316, knobs {"n_clusters": 2100, "hub_share": 0.123}, in 3.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory.

**Constraints that shape the design.** Merges proposed never applied automatically; Stewards approve each cluster; Safety-relevant parts need engineering review

**Label in this use case.** For "Part Master Deduplication": Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Description-only matching.

## 2. Choose the signals

Your strongest signal is **Attribute match** (agreement of dimensions, material and standard). Its rule: Normalised units. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 50.8% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.95% and purity 75.1%, producing a cluster of 368 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.9% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 85.4% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 368 vs 9 |

## 5. An edge case from the blueprint

**Look-alike parts.** similar but different specifications. Planned response: Attribute conflicts block merges. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3790 |
| `test_entities` | 1508 |
| `candidate_pairs_test` | 2399 |
| `hub_pairs_share` | 0.50813 |
| `any_shared_value.pair_precision` | 0.019471 |
| `any_shared_value.pair_recall` | 0.85558 |
| `any_shared_value.purity` | 0.75066 |
| `any_shared_value.largest_cluster` | 368 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.8543 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
