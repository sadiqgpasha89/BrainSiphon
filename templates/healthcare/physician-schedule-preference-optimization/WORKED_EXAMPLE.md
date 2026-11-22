# Physician Schedule Preference Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 63126, knobs {"n_instances": 187, "noise": 0.28}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations.

**Constraints that shape the design.** The scheduling committee approves final schedules and exceptions; Coverage, skill, continuity, workload and contract rules are hard constraints; Preferences are soft and fairness in preference outcomes is measured

**Label in this use case.** For "Physician Schedule Preference Optimization": Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating preferences as hard constraints.

## 2. Choose the signals

Your strongest signal is **Preference weight and window** (rank and timing of each request). Its rule: Submission data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 30.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 32.8% worse than the oracle plan; optimal assignment on predictions is 15.6% worse; adding an uncertainty penalty gives 12.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 32.8% |
| Regret versus oracle, optimal on predictions | 15.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 12.6% |
| Promised versus realised cost gap, optimal on predictions | 30.3% |

## 5. An edge case from the blueprint

**Many conflicting requests.** satisfaction is low. Planned response: Show the binding constraints and options. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 187 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 121.46 |
| `greedy_on_predictions.promised_cost` | 99.337 |
| `greedy_on_predictions.optimism_gap_pct` | 22.267 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 32.823 |
| `optimal_on_predictions.realised_cost` | 105.67 |
| `optimal_on_predictions.promised_cost` | 81.125 |
| `optimal_on_predictions.optimism_gap_pct` | 30.256 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 15.56 |
| `optimal_with_uncertainty_penalty.realised_cost` | 103 |
| `optimal_with_uncertainty_penalty.promised_cost` | 82.595 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 24.708 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 12.643 |
| `oracle_true_costs.realised_cost` | 91.442 |
| `oracle_true_costs.promised_cost` | 93.751 |
| `oracle_true_costs.optimism_gap_pct` | -2.4627 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
