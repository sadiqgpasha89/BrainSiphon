# Lead-to-Account Matching & Entity Resolution: worked example

> Run on synthetic data with `graph` engine, seed 12391, knobs {"n_clusters": 1780, "hub_share": 0.126}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics.

**Constraints that shape the design.** Millions of records; Precision above 99% for merges; Domain and name variations

**Label in this use case.** For "Lead-to-Account Matching & Entity Resolution": Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positive labels only from exact matches.

## 2. Choose the signals

Your strongest signal is **Email domain match** (normalised company domain). Its rule: Free-mail exclusion. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 52.2% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 3.50% and purity 76.2%, producing a cluster of 238 records. The weighted pair model links with precision 99.8% and purity 99.9%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 3.5% |
| Pair precision, weighted model | 99.8% |
| Pair recall, weighted model | 82.2% |
| Cluster purity, weighted model | 99.9% |
| Largest cluster, rule versus model | 238 vs 9 |

## 5. An edge case from the blueprint

**Free-mail domains (gmail.com).** unrelated leads merged by domain. Planned response: Free-mail blocklist and name-based fallback. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3209 |
| `test_entities` | 1300 |
| `candidate_pairs_test` | 1960 |
| `hub_pairs_share` | 0.52194 |
| `any_shared_value.pair_precision` | 0.034974 |
| `any_shared_value.pair_recall` | 0.82775 |
| `any_shared_value.purity` | 0.76231 |
| `any_shared_value.largest_cluster` | 238 |
| `weighted_pair_model.pair_precision` | 0.99811 |
| `weighted_pair_model.pair_recall` | 0.82151 |
| `weighted_pair_model.purity` | 0.99923 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
