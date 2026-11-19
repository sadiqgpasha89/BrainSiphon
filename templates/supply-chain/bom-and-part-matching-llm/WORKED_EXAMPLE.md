# BOM Parsing & Part Matching with LLMs: worked example

> Run on synthetic data with `graph` engine, seed 31158, knobs {"n_clusters": 1950, "hub_share": 0.086}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors.

**Constraints that shape the design.** Parametric correctness (a 10k resistor is not 1k); Traceability; Millions of parts

**Label in this use case.** For "BOM Parsing & Part Matching with LLMs": Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test BOMs cleaner than production.

## 2. Choose the signals

Your strongest signal is **Parameter equality checks** (numeric tolerance comparisons). Its rule: Unit normalisation. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 40.3% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 5.45% and purity 78.0%, producing a cluster of 167 records. The weighted pair model links with precision 96.0% and purity 99.6%; its largest cluster is 14.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 5.5% |
| Pair precision, weighted model | 96.0% |
| Pair recall, weighted model | 84.7% |
| Cluster purity, weighted model | 99.6% |
| Largest cluster, rule versus model | 167 vs 14 |

## 5. An edge case from the blueprint

**Unit ambiguity (mm vs inch).** wrong dimension accepted. Planned response: Unit normalisation and unit-conflict blocks. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3611 |
| `test_entities` | 1438 |
| `candidate_pairs_test` | 2001 |
| `hub_pairs_share` | 0.4033 |
| `any_shared_value.pair_precision` | 0.054533 |
| `any_shared_value.pair_recall` | 0.84792 |
| `any_shared_value.purity` | 0.78025 |
| `any_shared_value.largest_cluster` | 167 |
| `weighted_pair_model.pair_precision` | 0.95989 |
| `weighted_pair_model.pair_recall` | 0.84668 |
| `weighted_pair_model.purity` | 0.99583 |
| `weighted_pair_model.largest_cluster` | 14 |

</details>
