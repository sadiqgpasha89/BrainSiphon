# Data Clean-Room Audience Matching & Measurement: worked example

> Run on synthetic data with `graph` engine, seed 24168, knobs {"n_clusters": 1910, "hub_share": 0.091}, in 1.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data.

**Constraints that shape the design.** No row-level data leaves the room; Query privacy rules; Match rate transparency

**Label in this use case.** For "Data Clean-Room Audience Matching & Measurement": Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating match rate without precision.

## 2. Choose the signals

Your strongest signal is **Match key quality** (hashed email normalisation consistency). Its rule: Normalisation. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 46.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 7.22% and purity 78.3%, producing a cluster of 137 records. The weighted pair model links with precision 93.5% and purity 99.3%; its largest cluster is 14.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 7.2% |
| Pair precision, weighted model | 93.5% |
| Pair recall, weighted model | 82.8% |
| Cluster purity, weighted model | 99.3% |
| Largest cluster, rule versus model | 137 vs 14 |

## 5. An edge case from the blueprint

**Match keys normalised differently.** the two parties normalise emails differently and the match rate falls far below expectations. Planned response: Shared normalisation spec and validators. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3433 |
| `test_entities` | 1352 |
| `candidate_pairs_test` | 1876 |
| `hub_pairs_share` | 0.46482 |
| `any_shared_value.pair_precision` | 0.072239 |
| `any_shared_value.pair_recall` | 0.82825 |
| `any_shared_value.purity` | 0.78254 |
| `any_shared_value.largest_cluster` | 137 |
| `weighted_pair_model.pair_precision` | 0.93535 |
| `weighted_pair_model.pair_recall` | 0.82825 |
| `weighted_pair_model.purity` | 0.99334 |
| `weighted_pair_model.largest_cluster` | 14 |

</details>
