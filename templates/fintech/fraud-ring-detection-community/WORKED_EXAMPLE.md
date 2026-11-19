# Fraud Ring Detection via Community Detection: worked example

> Run on synthetic data with `graph` engine, seed 86738, knobs {"n_clusters": 1590, "hub_share": 0.117}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking.

**Constraints that shape the design.** Ring decisions need human sign-off; Graph of 1B edges; Weekly full run plus daily incremental

**Label in this use case.** For "Fraud Ring Detection via Community Detection": Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on rings found by the same heuristic.

## 2. Choose the signals

Your strongest signal is **Shared-resource density** (share of accounts in a cluster sharing devices or payment instruments). Its rule: Resource IDs hashed at event time. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 47.0% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 4.42% and purity 75.7%, producing a cluster of 207 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 4.4% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 82.5% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 207 vs 9 |

## 5. An edge case from the blueprint

**Corporate NAT merges unrelated users.** giant false component. Planned response: Edge down-weighting for high-degree shared resources. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2907 |
| `test_entities` | 1180 |
| `candidate_pairs_test` | 1790 |
| `hub_pairs_share` | 0.46983 |
| `any_shared_value.pair_precision` | 0.044225 |
| `any_shared_value.pair_recall` | 0.82655 |
| `any_shared_value.purity` | 0.75678 |
| `any_shared_value.largest_cluster` | 207 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.82502 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
