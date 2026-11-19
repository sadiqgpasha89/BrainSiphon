# Cloud IAM Privilege Anomaly & Least-Privilege: worked example

> Run on synthetic data with `graph` engine, seed 85269, knobs {"n_clusters": 1680, "hub_share": 0.112}, in 1.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles.

**Constraints that shape the design.** No outages from permission removal; Complex trust relationships; Audit logs at scale

**Label in this use case.** For "Cloud IAM Privilege Anomaly & Least-Privilege": Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Short usage windows.

## 2. Choose the signals

Your strongest signal is **Permission use ratio** (used divided by granted permissions). Its rule: Window length. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 41.7% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 3.36% and purity 74.8%, producing a cluster of 272 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 3.4% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 88.4% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 272 vs 9 |

## 5. An edge case from the blueprint

**Quarterly job needs permissions rarely used.** removal breaks it. Planned response: Long usage windows and staged removal with alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3112 |
| `test_entities` | 1270 |
| `candidate_pairs_test` | 1925 |
| `hub_pairs_share` | 0.41662 |
| `any_shared_value.pair_precision` | 0.033559 |
| `any_shared_value.pair_recall` | 0.8844 |
| `any_shared_value.purity` | 0.74803 |
| `any_shared_value.largest_cluster` | 272 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.88372 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
