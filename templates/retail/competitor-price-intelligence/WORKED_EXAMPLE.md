# Competitor Price Intelligence & Matching: worked example

> Run on synthetic data with `graph` engine, seed 59149, knobs {"n_clusters": 1490, "hub_share": 0.095}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams.

**Constraints that shape the design.** Legal scraping boundaries; Match precision above 98%; Daily refresh for 5M SKUs

**Label in this use case.** For "Competitor Price Intelligence & Matching": Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Precision measured on GTIN-matched easy pairs.

## 2. Choose the signals

Your strongest signal is **Match confidence** (calibrated pair probability). Its rule: Per-category calibration. In the starter, the closest executable idea is **shared-value rarity**: how many entities share each linking value, so a value shared by three says more than one shared by three hundred. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Shared hubs (a common phone number or address) join unrelated records: 29.2% of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.

## 4. Baseline against the stronger design

The shared-value rule links with precision 20.36% and purity 84.9%, producing a cluster of 68 records. The weighted pair model links with precision 99.4% and purity 99.8%; its largest cluster is 9.

| Result | Value |
|---|---|
| Pair precision, shared-value rule | 20.4% |
| Pair precision, weighted model | 99.4% |
| Pair recall, weighted model | 86.7% |
| Cluster purity, weighted model | 99.8% |
| Largest cluster, rule versus model | 68 vs 9 |

## 5. An edge case from the blueprint

**Competitor changes page layout.** extractor returns nulls. Planned response: Extraction health monitors and LLM fallback. Write the test that replays this case through your pipeline before you tune anything.

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
| `entities` | 2754 |
| `test_entities` | 1079 |
| `candidate_pairs_test` | 1243 |
| `hub_pairs_share` | 0.29204 |
| `any_shared_value.pair_precision` | 0.20363 |
| `any_shared_value.pair_recall` | 0.86715 |
| `any_shared_value.purity` | 0.84893 |
| `any_shared_value.largest_cluster` | 68 |
| `weighted_pair_model.pair_precision` | 0.99383 |
| `weighted_pair_model.pair_recall` | 0.86715 |
| `weighted_pair_model.purity` | 0.99815 |
| `weighted_pair_model.largest_cluster` | 9 |

</details>
