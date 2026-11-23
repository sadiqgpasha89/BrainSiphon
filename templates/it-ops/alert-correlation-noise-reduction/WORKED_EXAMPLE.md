# Alert Correlation and Noise Reduction: worked example

> Run on synthetic data with `graph` engine, seed 81183, knobs {"n_clusters": 1610, "hub_share": 0.153}, in 2.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage.

**Constraints that shape the design.** Suppressed alerts stay visible inside the incident; Critical alerts always page within 60 s; Grouping within 5 s of arrival

**Label in this use case.** For "Alert Correlation and Noise Reduction": Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Name-based deduplication.

## 2. Choose the signals

Your strongest signal is **Service topology distance** (dependency path between alerting services). Its rule: From the CMDB and traces. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 64.1% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.80% and purity 69.7%, producing a cluster of 306 records. The weighted pair model links with precision 97.1% and purity 99.7%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.8% |
| Pair precision, weighted model | 97.1% |
| Pair recall, weighted model | 79.9% |
| Cluster purity, weighted model | 99.7% |
| Largest cluster, rule versus model | 306 vs 9 |

## 5. An edge case from the blueprint

**Missing topology.** the dependency map is out of date. Planned response: Fall back to time and text signals and flag the gap. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2929 |
| `test_entities` | 1147 |
| `candidate_pairs_test` | 2149 |
| `hub_pairs_share` | 0.64076 |
| `any_shared_value.pair_precision` | 0.018036 |
| `any_shared_value.pair_recall` | 0.80334 |
| `any_shared_value.purity` | 0.6966 |
| `any_shared_value.largest_cluster` | 306 |
| `weighted_pair_model.pair_precision` | 0.97069 |
| `weighted_pair_model.pair_recall` | 0.7987 |
| `weighted_pair_model.purity` | 0.99651 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
