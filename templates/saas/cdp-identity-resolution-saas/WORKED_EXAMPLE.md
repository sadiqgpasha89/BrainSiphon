# Customer Data Platform Identity Resolution: worked example

> Run on synthetic data with `graph` engine, seed 59091, knobs {"n_clusters": 1510, "hub_share": 0.136}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges.

**Constraints that shape the design.** Deterministic first; Privacy and consent; Unmerge capability

**Label in this use case.** For "Customer Data Platform Identity Resolution": Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating with deterministic links only.

## 2. Choose the signals

Your strongest signal is **Deterministic identifier match** (email, user ID). Its rule: Hashing. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 51.5% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 2.44% and purity 73.4%, producing a cluster of 286 records. The weighted pair model links with precision 86.0% and purity 98.7%; its largest cluster is 20.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 2.4% |
| Pair precision, weighted model | 86.0% |
| Pair recall, weighted model | 86.2% |
| Cluster purity, weighted model | 98.7% |
| Largest cluster, rule versus model | 286 vs 20 |

## 5. An edge case from the blueprint

**Shared family email merges different people.** marketing misfires. Planned response: Role-based email detection and conflict checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2787 |
| `test_entities` | 1118 |
| `candidate_pairs_test` | 1821 |
| `hub_pairs_share` | 0.51455 |
| `any_shared_value.pair_precision` | 0.024439 |
| `any_shared_value.pair_recall` | 0.87532 |
| `any_shared_value.purity` | 0.73435 |
| `any_shared_value.largest_cluster` | 286 |
| `weighted_pair_model.pair_precision` | 0.86021 |
| `weighted_pair_model.pair_recall` | 0.86242 |
| `weighted_pair_model.purity` | 0.98658 |
| `weighted_pair_model.largest_cluster` | 20 |

</details>
