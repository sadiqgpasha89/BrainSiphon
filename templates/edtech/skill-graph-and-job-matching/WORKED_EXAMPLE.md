# Skill Graph Extraction & Job Matching: worked example

> Run on synthetic data with `graph` engine, seed 37976, knobs {"n_clusters": 1830, "hub_share": 0.116}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps.

**Constraints that shape the design.** Taxonomy mapping (ESCO/O*NET); Bias in job data; Privacy of resumes

**Label in this use case.** For "Skill Graph Extraction & Job Matching": Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on taxonomy-covered skills only.

## 2. Choose the signals

Your strongest signal is **Canonical skill entities** (linked entities). Its rule: Linking. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 50.3% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 2.43% and purity 74.6%, producing a cluster of 314 records. The weighted pair model links with precision 95.3% and purity 99.5%; its largest cluster is 13.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 2.4% |
| Pair precision, weighted model | 95.3% |
| Pair recall, weighted model | 85.0% |
| Cluster purity, weighted model | 99.5% |
| Largest cluster, rule versus model | 314 vs 13 |

## 5. An edge case from the blueprint

**Emerging skills not in taxonomy.** invisible to matching. Planned response: Taxonomy proposal pipeline. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3366 |
| `test_entities` | 1342 |
| `candidate_pairs_test` | 2179 |
| `hub_pairs_share` | 0.50252 |
| `any_shared_value.pair_precision` | 0.024273 |
| `any_shared_value.pair_recall` | 0.85167 |
| `any_shared_value.purity` | 0.7459 |
| `any_shared_value.largest_cluster` | 314 |
| `weighted_pair_model.pair_precision` | 0.95316 |
| `weighted_pair_model.pair_recall` | 0.85028 |
| `weighted_pair_model.purity` | 0.99478 |
| `weighted_pair_model.largest_cluster` | 13 |

</details>
