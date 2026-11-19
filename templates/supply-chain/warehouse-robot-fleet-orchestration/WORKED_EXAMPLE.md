# Warehouse Robot Fleet Orchestration: worked example

> Run on synthetic data with `optimize` engine, seed 18283, knobs {"n_instances": 184, "noise": 0.438}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput.

**Constraints that shape the design.** Safety-critical collision avoidance; Plan updates under 100 ms; Battery management

**Label in this use case.** For "Warehouse Robot Fleet Orchestration": Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training in empty warehouses.

## 2. Choose the signals

Your strongest signal is **Task-robot assignment cost** (travel plus battery cost). Its rule: Map state. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 73.8% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 48.9% worse than the oracle plan; optimal assignment on predictions is 33.8% worse; adding an uncertainty penalty gives 25.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 48.9% |
| Regret versus oracle, optimal on predictions | 33.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 25.8% |
| Promised versus realised cost gap, optimal on predictions | 73.8% |

## 5. An edge case from the blueprint

**Wireless network drop.** robots lose coordination. Planned response: Local safe-stop behaviour and degraded autonomy. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 184 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 136.55 |
| `greedy_on_predictions.promised_cost` | 90.682 |
| `greedy_on_predictions.optimism_gap_pct` | 50.58 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 48.853 |
| `optimal_on_predictions.realised_cost` | 122.78 |
| `optimal_on_predictions.promised_cost` | 70.642 |
| `optimal_on_predictions.optimism_gap_pct` | 73.808 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 33.844 |
| `optimal_with_uncertainty_penalty.realised_cost` | 115.41 |
| `optimal_with_uncertainty_penalty.promised_cost` | 73.573 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 56.866 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 25.81 |
| `oracle_true_costs.realised_cost` | 91.734 |
| `oracle_true_costs.promised_cost` | 100.83 |
| `oracle_true_costs.optimism_gap_pct` | -9.0206 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
