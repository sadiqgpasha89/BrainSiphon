# Physician On-Call & Call-Rotation Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 2526, knobs {"n_instances": 184, "noise": 0.368}, in 3.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override.

**Constraints that shape the design.** Physician leadership approves and publishes every rotation and the solver only proposes; Coverage, privileges, rest and contract rules are hard constraints with a proof of satisfaction; Fairness is measured against comparable groups and reported

**Label in this use case.** For "Physician On-Call & Call-Rotation Optimization": Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Soft-penalising a rest rule.

## 2. Choose the signals

Your strongest signal is **Availability and leave** (blocked dates and leave per physician). Its rule: Roster snapshot. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 51.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 42.4% worse than the oracle plan; optimal assignment on predictions is 25.7% worse; adding an uncertainty penalty gives 20.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 42.4% |
| Regret versus oracle, optimal on predictions | 25.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 20.5% |
| Promised versus realised cost gap, optimal on predictions | 51.4% |

## 5. An edge case from the blueprint

**Infeasible coverage.** no rotation satisfies all rules. Planned response: Show the binding rules and options for leadership. Write the test that replays this case through your pipeline before you tune anything.

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
| `greedy_on_predictions.realised_cost` | 129.44 |
| `greedy_on_predictions.promised_cost` | 95.25 |
| `greedy_on_predictions.optimism_gap_pct` | 35.893 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 42.41 |
| `optimal_on_predictions.realised_cost` | 114.28 |
| `optimal_on_predictions.promised_cost` | 75.473 |
| `optimal_on_predictions.optimism_gap_pct` | 51.413 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 25.728 |
| `optimal_with_uncertainty_penalty.realised_cost` | 109.53 |
| `optimal_with_uncertainty_penalty.promised_cost` | 77.875 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 40.646 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 20.504 |
| `oracle_true_costs.realised_cost` | 90.891 |
| `oracle_true_costs.promised_cost` | 96.849 |
| `oracle_true_costs.optimism_gap_pct` | -6.1515 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
