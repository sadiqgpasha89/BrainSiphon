# Binary Code Similarity & Vulnerability Matching: worked example

> Run on synthetic data with `graph` engine, seed 15295, knobs {"n_clusters": 1650, "hub_share": 0.081}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale.

**Constraints that shape the design.** Cross-architecture matching; Millions of functions; Stripped symbols

**Label in this use case.** For "Binary Code Similarity & Vulnerability Matching": Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation only on same-compiler pairs.

## 2. Choose the signals

Your strongest signal is **Control-flow-graph embedding** (GNN over CFG). Its rule: Disassembly quality. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 24.0% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 11.09% and purity 83.1%, producing a cluster of 130 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 11.1% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.0% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 130 vs 9 |

## 5. An edge case from the blueprint

**Heavy obfuscation or virtualisation.** embeddings fail. Planned response: Dynamic analysis fallback and confidence thresholds. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2969 |
| `test_entities` | 1235 |
| `candidate_pairs_test` | 1411 |
| `hub_pairs_share` | 0.23955 |
| `any_shared_value.pair_precision` | 0.11086 |
| `any_shared_value.pair_recall` | 0.83001 |
| `any_shared_value.purity` | 0.83077 |
| `any_shared_value.largest_cluster` | 130 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.83001 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
