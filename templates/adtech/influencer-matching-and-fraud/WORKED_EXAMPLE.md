# Influencer Matching & Fake-Follower Detection: worked example

> Run on synthetic data with `graph` engine, seed 75570, knobs {"n_clusters": 1220, "hub_share": 0.14}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods.

**Constraints that shape the design.** Audience demographics privacy; Content brand safety; Fraud adaptation

**Label in this use case.** For "Influencer Matching & Fake-Follower Detection": Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Platform-provided signals manipulated.

## 2. Choose the signals

Your strongest signal is **Engagement authenticity score** (comment diversity and timing). Its rule: NLP. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 48.8% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 2.89% and purity 73.4%, producing a cluster of 227 records. The weighted pair model links with precision 92.6% and purity 99.2%; its largest cluster is 13.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 2.9% |
| Pair precision, weighted model | 92.6% |
| Pair recall, weighted model | 81.0% |
| Cluster purity, weighted model | 99.2% |
| Largest cluster, rule versus model | 227 vs 13 |

## 5. An edge case from the blueprint

**Engagement pods mimic organic comments.** coordinated pods post organic-looking comments so fake engagement passes the checks. Planned response: Network-level pod detection. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2254 |
| `test_entities` | 867 |
| `candidate_pairs_test` | 1266 |
| `hub_pairs_share` | 0.48815 |
| `any_shared_value.pair_precision` | 0.028862 |
| `any_shared_value.pair_recall` | 0.82747 |
| `any_shared_value.purity` | 0.73356 |
| `any_shared_value.largest_cluster` | 227 |
| `weighted_pair_model.pair_precision` | 0.92588 |
| `weighted_pair_model.pair_recall` | 0.80989 |
| `weighted_pair_model.purity` | 0.99193 |
| `weighted_pair_model.largest_cluster` | 13 |

</details>
