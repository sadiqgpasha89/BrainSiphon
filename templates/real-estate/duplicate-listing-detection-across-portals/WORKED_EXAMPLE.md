# Duplicate Listing Detection Across Portals: worked example

> Run on synthetic data with `graph` engine, seed 26600, knobs {"n_clusters": 1550, "hub_share": 0.102}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.

**Constraints that shape the design.** A false merge is treated as worse than a missed duplicate; Every merged listing keeps links to its source portals; Runs daily across all feeds in a fixed window

**Label in this use case.** For "Duplicate Listing Detection Across Portals": Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs.

## 2. Choose the signals

Your strongest signal is **Address match** (normalised and geocoded address equality with unit number retained). Its rule: Formats differ between portals, so normalise before comparing. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 50.1% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 3.48% and purity 78.1%, producing a cluster of 195 records. The weighted pair model links with precision 82.2% and purity 98.2%; its largest cluster is 14.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 3.5% |
| Pair precision, weighted model | 82.2% |
| Pair recall, weighted model | 85.5% |
| Cluster purity, weighted model | 98.2% |
| Largest cluster, rule versus model | 195 vs 14 |

## 5. An edge case from the blueprint

**Two units same address.** Several apartments share one address and are merged into one listing. Planned response: Include the unit number and floor in the identity key and merge only on unit-level evidence. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2745 |
| `test_entities` | 1033 |
| `candidate_pairs_test` | 1234 |
| `hub_pairs_share` | 0.50081 |
| `any_shared_value.pair_precision` | 0.034763 |
| `any_shared_value.pair_recall` | 0.8649 |
| `any_shared_value.purity` | 0.78122 |
| `any_shared_value.largest_cluster` | 195 |
| `weighted_pair_model.pair_precision` | 0.8216 |
| `weighted_pair_model.pair_recall` | 0.8548 |
| `weighted_pair_model.purity` | 0.98161 |
| `weighted_pair_model.largest_cluster` | 14 |

</details>
