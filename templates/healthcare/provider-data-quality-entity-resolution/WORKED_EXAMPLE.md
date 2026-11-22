# Provider Data Quality & Entity Resolution: worked example

> Run on synthetic data with `graph` engine, seed 35328, knobs {"n_clusters": 1380, "hub_share": 0.153}, in 3.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance.

**Constraints that shape the design.** A merge is never made on fuzzy name similarity alone and needs a strong identifier or steward approval; Source lineage and survivorship rules are preserved for every field; Data stewards approve merges and corrections

**Label in this use case.** For "Provider Data Quality & Entity Resolution": Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on random pairs instead of hard near-duplicates.

## 2. Choose the signals

Your strongest signal is **Identifier agreement** (exact match on strong identifiers with check-digit validation). Its rule: Validate against the authoritative registry. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 53.9% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.95% and purity 70.2%, producing a cluster of 300 records. The weighted pair model links with precision 95.1% and purity 99.3%; its largest cluster is 11.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 2.0% |
| Pair precision, weighted model | 95.1% |
| Pair recall, weighted model | 87.3% |
| Cluster purity, weighted model | 99.3% |
| Largest cluster, rule versus model | 300 vs 11 |

## 5. An edge case from the blueprint

**Two providers with the same name and specialty.** a false merge risk. Planned response: Identifier conflict rules that block a merge. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2388 |
| `test_entities` | 976 |
| `candidate_pairs_test` | 1699 |
| `hub_pairs_share` | 0.53855 |
| `any_shared_value.pair_precision` | 0.019508 |
| `any_shared_value.pair_recall` | 0.88477 |
| `any_shared_value.purity` | 0.70184 |
| `any_shared_value.largest_cluster` | 300 |
| `weighted_pair_model.pair_precision` | 0.95087 |
| `weighted_pair_model.pair_recall` | 0.87275 |
| `weighted_pair_model.purity` | 0.99283 |
| `weighted_pair_model.largest_cluster` | 11 |

</details>
