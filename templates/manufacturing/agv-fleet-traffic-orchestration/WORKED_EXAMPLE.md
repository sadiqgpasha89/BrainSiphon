# AGV Fleet Traffic Orchestration: worked example

> Run on synthetic data with `optimize` engine, seed 61517, knobs {"n_instances": 196, "noise": 0.436}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time.

**Constraints that shape the design.** Collision avoidance remains with vehicle safety systems; Re-plan within 1 s after a blockage; Priority rules for urgent missions

**Label in this use case.** For "AGV Fleet Traffic Orchestration": Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Independent shortest paths.

## 2. Choose the signals

Your strongest signal is **Segment occupancy and reservation** (which segments are held and when). Its rule: Live map. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 74.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 48.5% worse than the oracle plan; optimal assignment on predictions is 33.1% worse; adding an uncertainty penalty gives 26.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 48.5% |
| Regret versus oracle, optimal on predictions | 33.1% |
| Regret versus oracle, optimal with an uncertainty penalty | 26.2% |
| Promised versus realised cost gap, optimal on predictions | 74.2% |

## 5. An edge case from the blueprint

**Blocked aisle.** a pallet is left in the lane. Planned response: Detect blockage and reroute with an operator alert. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 196 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 135.56 |
| `greedy_on_predictions.promised_cost` | 89.21 |
| `greedy_on_predictions.optimism_gap_pct` | 51.955 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 48.459 |
| `optimal_on_predictions.realised_cost` | 121.58 |
| `optimal_on_predictions.promised_cost` | 69.798 |
| `optimal_on_predictions.optimism_gap_pct` | 74.183 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 33.144 |
| `optimal_with_uncertainty_penalty.realised_cost` | 115.27 |
| `optimal_with_uncertainty_penalty.promised_cost` | 72.971 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 57.967 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 26.239 |
| `oracle_true_costs.realised_cost` | 91.311 |
| `oracle_true_costs.promised_cost` | 98.271 |
| `oracle_true_costs.optimism_gap_pct` | -7.0825 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
