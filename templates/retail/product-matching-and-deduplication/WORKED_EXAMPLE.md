# Product Matching & Deduplication: worked example

> Run on synthetic data with `graph` engine, seed 67308, knobs {"n_clusters": 1780, "hub_share": 0.086}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat.

**Constraints that shape the design.** Billions of candidate pairs; Precision above 99% for merges; GTIN not always present

**Label in this use case.** For "Product Matching & Deduplication": Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positive pairs mined from GTIN only.

## 2. Choose the signals

Your strongest signal is **GTIN or MPN agreement** (exact or normalised identifier match). Its rule: Validate check digits. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 38.6% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 11.95% and purity 81.6%, producing a cluster of 95 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 11.9% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 82.9% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 95 vs 9 |

## 5. An edge case from the blueprint

**Bundle vs single item.** false merge of different pack sizes. Planned response: Pack-quantity extraction as hard constraint. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3258 |
| `test_entities` | 1333 |
| `candidate_pairs_test` | 1734 |
| `hub_pairs_share` | 0.38581 |
| `any_shared_value.pair_precision` | 0.11948 |
| `any_shared_value.pair_recall` | 0.83217 |
| `any_shared_value.purity` | 0.8162 |
| `any_shared_value.largest_cluster` | 95 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.82939 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
