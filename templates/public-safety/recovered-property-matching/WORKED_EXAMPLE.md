# Recovered Property Matching: worked example

> Run on synthetic data with `graph` engine, seed 15228, knobs {"n_clusters": 1730, "hub_share": 0.128}, in 2.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner.

**Constraints that shape the design.** Matches proposed to a property officer; Return only after owner verification; Serial numbers matched exactly where present

**Label in this use case.** For "Recovered Property Matching": Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic release.

## 2. Choose the signals

Your strongest signal is **Serial number match** (exact or near match). Its rule: From records. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 54.1% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 2.96% and purity 73.9%, producing a cluster of 276 records. The weighted pair model links with precision 99.9% and purity 99.9%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 3.0% |
| Pair precision, weighted model | 99.9% |
| Pair recall, weighted model | 83.0% |
| Cluster purity, weighted model | 99.9% |
| Largest cluster, rule versus model | 276 vs 9 |

## 5. An edge case from the blueprint

**Common items.** many phones look the same. Planned response: Serial and mark requirements. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3075 |
| `test_entities` | 1309 |
| `candidate_pairs_test` | 2363 |
| `hub_pairs_share` | 0.54126 |
| `any_shared_value.pair_precision` | 0.029642 |
| `any_shared_value.pair_recall` | 0.8359 |
| `any_shared_value.purity` | 0.73873 |
| `any_shared_value.largest_cluster` | 276 |
| `weighted_pair_model.pair_precision` | 0.99919 |
| `weighted_pair_model.pair_recall` | 0.82987 |
| `weighted_pair_model.purity` | 0.99924 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
