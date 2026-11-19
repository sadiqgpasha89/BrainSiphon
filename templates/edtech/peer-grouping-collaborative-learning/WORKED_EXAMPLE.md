# Peer Grouping for Collaborative Learning: worked example

> Run on synthetic data with `graph` engine, seed 82358, knobs {"n_clusters": 1770, "hub_share": 0.158}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history.

**Constraints that shape the design.** Group-size limits; Avoid isolating students; Schedule compatibility

**Label in this use case.** For "Peer Grouping for Collaborative Learning": Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising averages.

## 2. Choose the signals

Your strongest signal is **Skill complementarity** (difference in mastery profile). Its rule: KT. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 61.2% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.37% and purity 66.4%, producing a cluster of 451 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.4% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 87.3% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 451 vs 9 |

## 5. An edge case from the blueprint

**Absent students break groups.** groups too small. Planned response: Substitution rules and rebalancing. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3216 |
| `test_entities` | 1316 |
| `candidate_pairs_test` | 3098 |
| `hub_pairs_share` | 0.61168 |
| `any_shared_value.pair_precision` | 0.013657 |
| `any_shared_value.pair_recall` | 0.89416 |
| `any_shared_value.purity` | 0.66413 |
| `any_shared_value.largest_cluster` | 451 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.873 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
