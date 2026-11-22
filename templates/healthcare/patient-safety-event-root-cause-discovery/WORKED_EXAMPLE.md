# Patient Safety Event Root-Cause Discovery: worked example

> Run on synthetic data with `graph` engine, seed 35487, knobs {"n_clusters": 1870, "hub_share": 0.158}, in 5.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation.

**Constraints that shape the design.** Narratives are de-identified before analysis; Output is a hypothesis with evidence links and never a causal claim or a finding of blame; Investigators lead causal analysis using the approved taxonomy

**Label in this use case.** For "Patient Safety Event Root-Cause Discovery": Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reporting a correlation as a cause.

## 2. Choose the signals

Your strongest signal is **Semantic cluster membership** (embedding-based cluster of narratives with coherence score). Its rule: De-identified text only. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 62.1% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.66% and purity 68.6%, producing a cluster of 380 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.7% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 85.8% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 380 vs 9 |

## 5. An edge case from the blueprint

**Reporting culture change.** volume of reports shifts patterns. Planned response: Normalise by reporting rate and flag the change. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3427 |
| `test_entities` | 1367 |
| `candidate_pairs_test` | 2918 |
| `hub_pairs_share` | 0.62097 |
| `any_shared_value.pair_precision` | 0.016614 |
| `any_shared_value.pair_recall` | 0.8619 |
| `any_shared_value.purity` | 0.68617 |
| `any_shared_value.largest_cluster` | 380 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.85774 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
