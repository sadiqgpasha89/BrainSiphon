# Load Consolidation & 3D Bin Packing: worked example

> Run on synthetic data with `optimize` engine, seed 18922, knobs {"n_instances": 120, "noise": 0.43}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order.

**Constraints that shape the design.** Axle weight limits; Fragile and stacking rules; Delivery sequence

**Label in this use case.** For "Load Consolidation & 3D Bin Packing": Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Benchmarks with random boxes.

## 2. Choose the signals

Your strongest signal is **Item dimensions and fragility class** (master data). Its rule: Accuracy. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 72.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 49.4% worse than the oracle plan; optimal assignment on predictions is 34.0% worse; adding an uncertainty penalty gives 25.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 49.4% |
| Regret versus oracle, optimal on predictions | 34.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 25.7% |
| Promised versus realised cost gap, optimal on predictions | 72.7% |

## 5. An edge case from the blueprint

**Wrong item dimensions.** packing infeasible on dock. Planned response: Dimension audits and scan-based verification. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Judge a plan by its realised cost against an oracle on simulated truth, not by the objective the optimiser reported. Keep the uncertainty penalty and the optimism-gap metric.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `instances` | 120 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 136.16 |
| `greedy_on_predictions.promised_cost` | 89.89 |
| `greedy_on_predictions.optimism_gap_pct` | 51.475 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 49.364 |
| `optimal_on_predictions.realised_cost` | 122.17 |
| `optimal_on_predictions.promised_cost` | 70.737 |
| `optimal_on_predictions.optimism_gap_pct` | 72.706 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 34.013 |
| `optimal_with_uncertainty_penalty.realised_cost` | 114.54 |
| `optimal_with_uncertainty_penalty.promised_cost` | 73.463 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 55.921 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 25.651 |
| `oracle_true_costs.realised_cost` | 91.16 |
| `oracle_true_costs.promised_cost` | 99.541 |
| `oracle_true_costs.optimism_gap_pct` | -8.4188 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
