# Provider Data Reconciliation Across Payer Systems: worked example

> Run on synthetic data with `graph` engine, seed 18595, knobs {"n_clusters": 1880, "hub_share": 0.103}, in 3.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history.

**Constraints that shape the design.** The data steward approves merges and authoritative-field rules and the tool never merges records or writes to a source system on its own; Identifiers are used first and fuzzy matches go to review with a threshold; Survivorship rules are explicit and versioned

**Label in this use case.** For "Provider Data Reconciliation Across Payer Systems": Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-merging fuzzy matches.

## 2. Choose the signals

Your strongest signal is **Identifier agreement** (agreement of NPIs and other identifiers across records). Its rule: Source records. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 49.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 2.52% and purity 76.7%, producing a cluster of 301 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 2.5% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.5% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 301 vs 9 |

## 5. An edge case from the blueprint

**Shared practice address.** different providers look alike. Planned response: Identifier-first rules and a review threshold. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3404 |
| `test_entities` | 1367 |
| `candidate_pairs_test` | 2062 |
| `hub_pairs_share` | 0.49515 |
| `any_shared_value.pair_precision` | 0.025154 |
| `any_shared_value.pair_recall` | 0.83572 |
| `any_shared_value.purity` | 0.76737 |
| `any_shared_value.largest_cluster` | 301 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.83501 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
