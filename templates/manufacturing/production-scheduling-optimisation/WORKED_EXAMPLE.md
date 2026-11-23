# Production Scheduling Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 1996, knobs {"n_instances": 193, "noise": 0.343}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall.

**Constraints that shape the design.** Hard constraints on capacity, tooling and shift calendars; Planner can freeze and edit any order; Re-plan within 60 s after a disruption

**Label in this use case.** For "Production Scheduling Optimisation": Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Planning on nominal capacity.

## 2. Choose the signals

Your strongest signal is **Predicted processing time** (duration model by product, machine and tool). Its rule: Use confirmed durations. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 45.6% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.3% worse than the oracle plan; optimal assignment on predictions is 22.4% worse; adding an uncertainty penalty gives 17.4%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.3% |
| Regret versus oracle, optimal on predictions | 22.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.4% |
| Promised versus realised cost gap, optimal on predictions | 45.6% |

## 5. An edge case from the blueprint

**Machine breakdown.** the schedule becomes infeasible mid-shift. Planned response: Event-driven repair that moves the fewest orders. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 193 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.85 |
| `greedy_on_predictions.promised_cost` | 95.474 |
| `greedy_on_predictions.optimism_gap_pct` | 32.86 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.257 |
| `optimal_on_predictions.realised_cost` | 112.26 |
| `optimal_on_predictions.promised_cost` | 77.105 |
| `optimal_on_predictions.optimism_gap_pct` | 45.59 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 22.354 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.75 |
| `optimal_with_uncertainty_penalty.promised_cost` | 79.064 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 36.277 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.437 |
| `oracle_true_costs.realised_cost` | 91.747 |
| `oracle_true_costs.promised_cost` | 96.019 |
| `oracle_true_costs.optimism_gap_pct` | -4.4487 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
