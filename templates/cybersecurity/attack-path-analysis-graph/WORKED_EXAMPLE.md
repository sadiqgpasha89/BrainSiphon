# Attack Path Analysis on Enterprise Graphs: worked example

> Run on synthetic data with `graph` engine, seed 39644, knobs {"n_clusters": 1650, "hub_share": 0.148}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them.

**Constraints that shape the design.** Graph of millions of nodes; Continuous updates; Explainable paths

**Label in this use case.** For "Attack Path Analysis on Enterprise Graphs": Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validation lacking red-team ground truth.

## 2. Choose the signals

Your strongest signal is **Edge exploit probability** (exploit likelihood for the technique). Its rule: Vulnerability data. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 58.0% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.48% and purity 69.4%, producing a cluster of 364 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.5% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 87.9% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 364 vs 9 |

## 5. An edge case from the blueprint

**Graph stale after cloud changes.** paths reported that no longer exist. Planned response: Streaming updates from cloud audit logs. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2888 |
| `test_entities` | 1160 |
| `candidate_pairs_test` | 2092 |
| `hub_pairs_share` | 0.57983 |
| `any_shared_value.pair_precision` | 0.014753 |
| `any_shared_value.pair_recall` | 0.8902 |
| `any_shared_value.purity` | 0.69397 |
| `any_shared_value.largest_cluster` | 364 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.87931 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
