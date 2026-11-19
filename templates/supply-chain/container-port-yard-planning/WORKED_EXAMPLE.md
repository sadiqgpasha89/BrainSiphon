# Container Yard Stacking & Crane Planning: worked example

> Run on synthetic data with `optimize` engine, seed 9874, knobs {"n_instances": 199, "noise": 0.265}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time.

**Constraints that shape the design.** Vessel schedules; Container weight and type constraints; Reefer plugs

**Label in this use case.** For "Container Yard Stacking & Crane Planning": Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator with perfect information.

## 2. Choose the signals

Your strongest signal is **Pickup-time prediction** (predicted dwell time per container). Its rule: Consignee history. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 26.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 30.4% worse than the oracle plan; optimal assignment on predictions is 13.8% worse; adding an uncertainty penalty gives 11.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 30.4% |
| Regret versus oracle, optimal on predictions | 13.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 11.5% |
| Promised versus realised cost gap, optimal on predictions | 26.3% |

## 5. An edge case from the blueprint

**Vessel arrives early or late.** plan invalidated. Planned response: Rolling-horizon replan with disturbance triggers. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 199 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 119.23 |
| `greedy_on_predictions.promised_cost` | 99.558 |
| `greedy_on_predictions.optimism_gap_pct` | 19.758 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 30.359 |
| `optimal_on_predictions.realised_cost` | 104.1 |
| `optimal_on_predictions.promised_cost` | 82.426 |
| `optimal_on_predictions.optimism_gap_pct` | 26.291 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 13.813 |
| `optimal_with_uncertainty_penalty.realised_cost` | 101.94 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.839 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 21.595 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 11.461 |
| `oracle_true_costs.realised_cost` | 91.462 |
| `oracle_true_costs.promised_cost` | 94.533 |
| `oracle_true_costs.optimism_gap_pct` | -3.2483 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
