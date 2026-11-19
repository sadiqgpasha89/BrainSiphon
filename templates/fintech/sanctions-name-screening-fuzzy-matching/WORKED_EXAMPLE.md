# Sanctions Name Screening with Fuzzy Matching: worked example

> Run on synthetic data with `graph` engine, seed 77339, knobs {"n_clusters": 2070, "hub_share": 0.085}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%.

**Constraints that shape the design.** Recall must be near 100% on true listed names; 50 ms per name; List updates live within 15 minutes

**Label in this use case.** For "Sanctions Name Screening with Fuzzy Matching": Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set made of synthetic typos only.

## 2. Choose the signals

Your strongest signal is **Phonetic-embedding similarity** (cosine of character-aware name embeddings). Its rule: Evaluate on held-out alias families. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 43.1% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 12.56% and purity 81.5%, producing a cluster of 97 records. The weighted pair model links with precision 96.1% and purity 99.5%; its largest cluster is 13.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 12.6% |
| Pair precision, weighted model | 96.1% |
| Pair recall, weighted model | 85.2% |
| Cluster purity, weighted model | 99.5% |
| Largest cluster, rule versus model | 97 vs 13 |

## 5. An edge case from the blueprint

**List delta with 10k new entries.** index rebuild stalls. Planned response: Incremental index with blue-green swap. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3670 |
| `test_entities` | 1505 |
| `candidate_pairs_test` | 2119 |
| `hub_pairs_share` | 0.43086 |
| `any_shared_value.pair_precision` | 0.1256 |
| `any_shared_value.pair_recall` | 0.85208 |
| `any_shared_value.purity` | 0.81528 |
| `any_shared_value.largest_cluster` | 97 |
| `weighted_pair_model.pair_precision` | 0.96072 |
| `weighted_pair_model.pair_recall` | 0.85208 |
| `weighted_pair_model.purity` | 0.99535 |
| `weighted_pair_model.largest_cluster` | 13 |

</details>
