# Microservice Root-Cause Analysis: worked example

> Run on synthetic data with `graph` engine, seed 71098, knobs {"n_clusters": 1530, "hub_share": 0.134}, in 1.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis.

**Constraints that shape the design.** Dependency graph changes constantly; Partial telemetry; Explainability for on-call

**Label in this use case.** For "Microservice Root-Cause Analysis": Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on injected faults only.

## 2. Choose the signals

Your strongest signal is **Anomaly onset ordering** (earliest anomaly in the call graph). Its rule: Clock sync. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 52.2% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.79% and purity 68.1%, producing a cluster of 360 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.8% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.3% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 360 vs 9 |

## 5. An edge case from the blueprint

**Sampling drops the failing traces.** sampling discards the failing traces so the origin of the error is hidden. Planned response: Tail-based sampling for errors. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2804 |
| `test_entities` | 1135 |
| `candidate_pairs_test` | 2073 |
| `hub_pairs_share` | 0.52243 |
| `any_shared_value.pair_precision` | 0.017863 |
| `any_shared_value.pair_recall` | 0.84226 |
| `any_shared_value.purity` | 0.68106 |
| `any_shared_value.largest_cluster` | 360 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.83285 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
