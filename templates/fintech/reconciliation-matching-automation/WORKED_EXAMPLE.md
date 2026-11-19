# Payment & Ledger Reconciliation Matching: worked example

> Run on synthetic data with `graph` engine, seed 35037, knobs {"n_clusters": 1290, "hub_share": 0.16}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions.

**Constraints that shape the design.** Auditable matches; Day-end close deadline; Handle one-to-many and many-to-many

**Label in this use case.** For "Payment & Ledger Reconciliation Matching": Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on already-reconciled easy matches.

## 2. Choose the signals

Your strongest signal is **Amount delta within tolerance** (absolute and relative difference net of fees). Its rule: Fee tables as-of settlement date. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 60.7% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.36% and purity 64.0%, producing a cluster of 358 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.4% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 81.3% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 358 vs 9 |

## 5. An edge case from the blueprint

**Cut-off timing differences at month-end.** many items unmatched. Planned response: Period-boundary aware matching windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2387 |
| `test_entities` | 970 |
| `candidate_pairs_test` | 1862 |
| `hub_pairs_share` | 0.60687 |
| `any_shared_value.pair_precision` | 0.013551 |
| `any_shared_value.pair_recall` | 0.83413 |
| `any_shared_value.purity` | 0.64021 |
| `any_shared_value.largest_cluster` | 358 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.81304 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
