# Risk-Weighted Asset Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 83122, knobs {"n_instances": 156, "noise": 0.449}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most.

**Constraints that shape the design.** All actions respect limits and client commitments; Output explainable to the capital committee; Weekly refresh

**Label in this use case.** For "Risk-Weighted Asset Optimisation": Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting reductions that cannot be executed.

## 2. Choose the signals

Your strongest signal is **Marginal RWA per unit of income** (RWA released divided by income lost). Its rule: Allocation of shared costs matters. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 78.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 49.4% worse than the oracle plan; optimal assignment on predictions is 35.5% worse; adding an uncertainty penalty gives 26.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 49.4% |
| Regret versus oracle, optimal on predictions | 35.5% |
| Regret versus oracle, optimal with an uncertainty penalty | 26.8% |
| Promised versus realised cost gap, optimal on predictions | 78.3% |

## 5. An edge case from the blueprint

**Rule change mid-quarter.** The RWA calculation changes part-way through the quarter and the optimiser plans on rules that no longer apply. Planned response: Keep rule sets parameterised with effective dates and rerun the plan when a rule changes. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 156 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 137.87 |
| `greedy_on_predictions.promised_cost` | 89.327 |
| `greedy_on_predictions.optimism_gap_pct` | 54.347 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 49.404 |
| `optimal_on_predictions.realised_cost` | 125.08 |
| `optimal_on_predictions.promised_cost` | 70.144 |
| `optimal_on_predictions.optimism_gap_pct` | 78.324 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 35.544 |
| `optimal_with_uncertainty_penalty.realised_cost` | 117.02 |
| `optimal_with_uncertainty_penalty.promised_cost` | 73.108 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 60.071 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 26.811 |
| `oracle_true_costs.realised_cost` | 92.282 |
| `oracle_true_costs.promised_cost` | 102.96 |
| `oracle_true_costs.optimism_gap_pct` | -10.369 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
