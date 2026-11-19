# Drug-Drug Interaction & Adverse-Event Prediction: worked example

> Run on synthetic data with `graph` engine, seed 63191, knobs {"n_clusters": 1890, "hub_share": 0.139}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue.

**Constraints that shape the design.** 30 ms in the order-entry flow; Alert override rate monitored; Knowledge-base versioning

**Label in this use case.** For "Drug-Drug Interaction & Adverse-Event Prediction": Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Held-out pairs share drugs with train pairs.

## 2. Choose the signals

Your strongest signal is **Interaction knowledge-graph embedding** (link-prediction score between drugs). Its rule: Training on known pairs only. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 62.0% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 1.46% and purity 70.3%, producing a cluster of 391 records. The weighted pair model links with precision 100.0% and purity 100.0%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 1.5% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.7% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 391 vs 9 |

## 5. An edge case from the blueprint

**New drug approvals.** unknown to graph. Planned response: Rapid ingestion path from labels and curated updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 3370 |
| `test_entities` | 1372 |
| `candidate_pairs_test` | 2669 |
| `hub_pairs_share` | 0.62046 |
| `any_shared_value.pair_precision` | 0.014622 |
| `any_shared_value.pair_recall` | 0.84089 |
| `any_shared_value.purity` | 0.70262 |
| `any_shared_value.largest_cluster` | 391 |
| `weighted_pair_model.pair_precision` | 1 |
| `weighted_pair_model.pair_recall` | 0.83717 |
| `weighted_pair_model.purity` | 1 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
