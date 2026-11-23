# Ambulance Posting Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 78582, knobs {"n_instances": 190, "noise": 0.372}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor.

**Constraints that shape the design.** Coverage targets in every zone; Supervisor approves moves; Crew rest and shift rules respected

**Label in this use case.** For "Ambulance Posting Optimisation": Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average-time objectives.

## 2. Choose the signals

Your strongest signal is **Unit status and location** (available units and positions). Its rule: From AVL. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 52.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 41.4% worse than the oracle plan; optimal assignment on predictions is 25.4% worse; adding an uncertainty penalty gives 19.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 41.4% |
| Regret versus oracle, optimal on predictions | 25.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 19.8% |
| Promised versus realised cost gap, optimal on predictions | 52.9% |

## 5. An edge case from the blueprint

**Major incident.** many units are committed. Planned response: Surge mode and mutual aid view. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 190 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 129.87 |
| `greedy_on_predictions.promised_cost` | 94.249 |
| `greedy_on_predictions.optimism_gap_pct` | 37.794 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 41.443 |
| `optimal_on_predictions.realised_cost` | 115.09 |
| `optimal_on_predictions.promised_cost` | 75.258 |
| `optimal_on_predictions.optimism_gap_pct` | 52.934 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 25.351 |
| `optimal_with_uncertainty_penalty.realised_cost` | 109.96 |
| `optimal_with_uncertainty_penalty.promised_cost` | 77.557 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 41.78 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 19.759 |
| `oracle_true_costs.realised_cost` | 91.818 |
| `oracle_true_costs.promised_cost` | 97.865 |
| `oracle_true_costs.optimism_gap_pct` | -6.1788 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
