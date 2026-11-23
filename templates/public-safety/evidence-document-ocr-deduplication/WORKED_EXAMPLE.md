# Evidence Document OCR and Deduplication: worked example

> Run on synthetic data with `graph` engine, seed 83511, knobs {"n_clusters": 2040, "hub_share": 0.139}, in 3.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once.

**Constraints that shape the design.** Originals are never modified; Every derived file links to its original with a hash; Duplicates grouped not deleted

**Label in this use case.** For "Evidence Document OCR and Deduplication": Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Deleting duplicates.

## 2. Choose the signals

Your strongest signal is **Content hash and similarity** (hashes and text similarity). Its rule: From pipelines. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 61.8% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.39% and purity 69.7%, producing a cluster of 427 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.4% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 84.9% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 427 vs 9 |

## 5. An edge case from the blueprint

**Handwritten notes.** OCR is unreliable. Planned response: Flags and manual review. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3731 |
| `test_entities` | 1457 |
| `candidate_pairs_test` | 2948 |
| `hub_pairs_share` | 0.61805 |
| `any_shared_value.pair_precision` | 0.013909 |
| `any_shared_value.pair_recall` | 0.86003 |
| `any_shared_value.purity` | 0.69732 |
| `any_shared_value.largest_cluster` | 427 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.84859 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
