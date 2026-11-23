# Shared Micromobility Rebalancing: worked example

> Run on synthetic data with `optimize` engine, seed 33687, knobs {"n_instances": 144, "noise": 0.444}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient.

**Constraints that shape the design.** Zone-level forecasts and plans only; No tracking of individual riders; Crew routes within shift limits

**Label in this use case.** For "Shared Micromobility Rebalancing": Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Maximising rides only.

## 2. Choose the signals

Your strongest signal is **Zone demand forecast** (forecast departures). Its rule: From the model. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 75.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 49.8% worse than the oracle plan; optimal assignment on predictions is 33.8% worse; adding an uncertainty penalty gives 26.3%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 49.8% |
| Regret versus oracle, optimal on predictions | 33.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 26.3% |
| Promised versus realised cost gap, optimal on predictions | 75.7% |

## 5. An edge case from the blueprint

**Weather change.** rain collapses demand. Planned response: Fast re-plans. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 144 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 137.5 |
| `greedy_on_predictions.promised_cost` | 89.937 |
| `greedy_on_predictions.optimism_gap_pct` | 52.887 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 49.796 |
| `optimal_on_predictions.realised_cost` | 122.85 |
| `optimal_on_predictions.promised_cost` | 69.908 |
| `optimal_on_predictions.optimism_gap_pct` | 75.73 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 33.835 |
| `optimal_with_uncertainty_penalty.realised_cost` | 115.93 |
| `optimal_with_uncertainty_penalty.promised_cost` | 72.763 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 59.321 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 26.292 |
| `oracle_true_costs.realised_cost` | 91.792 |
| `oracle_true_costs.promised_cost` | 101.46 |
| `oracle_true_costs.optimism_gap_pct` | -9.5243 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
