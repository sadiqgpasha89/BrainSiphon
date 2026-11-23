# Alarm Correlation & Root-Cause Grouping: worked example

> Run on synthetic data with `graph` engine, seed 2378, knobs {"n_clusters": 1630, "hub_share": 0.146}, in 2.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms.

**Constraints that shape the design.** Grouping must respect the live topology and service dependencies; A suspected root cause is a ranked suggestion never an automatic action; Late alarms must join an existing incident

**Label in this use case.** For "Alarm Correlation & Root-Cause Grouping": Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Time-window correlation without topology.

## 2. Choose the signals

Your strongest signal is **Topological distance to the alarm cluster** (hop count on the dependency graph). Its rule: Topology must be current. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 57.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.76% and purity 70.0%, producing a cluster of 341 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.8% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.4% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 341 vs 9 |

## 5. An edge case from the blueprint

**Flapping link.** alarms appear and clear repeatedly. Planned response: Debounce and merge flaps into one incident with a count. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3017 |
| `test_entities` | 1208 |
| `candidate_pairs_test` | 2112 |
| `hub_pairs_share` | 0.57481 |
| `any_shared_value.pair_precision` | 0.017602 |
| `any_shared_value.pair_recall` | 0.84434 |
| `any_shared_value.purity` | 0.70033 |
| `any_shared_value.largest_cluster` | 341 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.83374 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
