# Field Crew Dispatch Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 84839, knobs {"n_instances": 172, "noise": 0.449}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient.

**Constraints that shape the design.** Skills and safety certifications are hard constraints; Dispatcher can override; Re-plan within 60 s after a new emergency

**Label in this use case.** For "Field Crew Dispatch Optimisation": Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Nearest-crew assignment only.

## 2. Choose the signals

Your strongest signal is **Job priority and deadline** (emergency level and due time). Its rule: From work management. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 77.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 50.4% worse than the oracle plan; optimal assignment on predictions is 34.6% worse; adding an uncertainty penalty gives 27.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 50.4% |
| Regret versus oracle, optimal on predictions | 34.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 27.8% |
| Promised versus realised cost gap, optimal on predictions | 77.4% |

## 5. An edge case from the blueprint

**Large storm.** demand exceeds crews. Planned response: Priority tiers and mutual aid planning. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 172 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 137.75 |
| `greedy_on_predictions.promised_cost` | 89.392 |
| `greedy_on_predictions.optimism_gap_pct` | 54.098 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 50.356 |
| `optimal_on_predictions.realised_cost` | 123.36 |
| `optimal_on_predictions.promised_cost` | 69.528 |
| `optimal_on_predictions.optimism_gap_pct` | 77.425 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 34.649 |
| `optimal_with_uncertainty_penalty.realised_cost` | 117.08 |
| `optimal_with_uncertainty_penalty.promised_cost` | 72.547 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 61.383 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 27.792 |
| `oracle_true_costs.realised_cost` | 91.616 |
| `oracle_true_costs.promised_cost` | 101.04 |
| `oracle_true_costs.optimism_gap_pct` | -9.3236 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
