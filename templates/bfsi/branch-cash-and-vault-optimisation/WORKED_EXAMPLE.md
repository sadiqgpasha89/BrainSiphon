# Branch Cash & Vault Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 36366, knobs {"n_instances": 107, "noise": 0.273}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash.

**Constraints that shape the design.** Insurance limits per vault; Cash-in-transit schedules are fixed; Weekly plan with daily adjustments

**Label in this use case.** For "Branch Cash & Vault Optimisation": Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on stocked-out days underestimates demand.

## 2. Choose the signals

Your strongest signal is **Withdrawal profile** (median daily withdrawals by branch and weekday). Its rule: Branch closures change patterns. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 28.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 31.2% worse than the oracle plan; optimal assignment on predictions is 15.0% worse; adding an uncertainty penalty gives 12.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 31.2% |
| Regret versus oracle, optimal on predictions | 15.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 12.6% |
| Promised versus realised cost gap, optimal on predictions | 28.9% |

## 5. An edge case from the blueprint

**Branch closure.** demand moves to nearby branches. Planned response: Link closures to neighbour forecasts. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 107 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 120.35 |
| `greedy_on_predictions.promised_cost` | 100.12 |
| `greedy_on_predictions.optimism_gap_pct` | 20.207 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 31.228 |
| `optimal_on_predictions.realised_cost` | 105.48 |
| `optimal_on_predictions.promised_cost` | 81.823 |
| `optimal_on_predictions.optimism_gap_pct` | 28.912 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 15.013 |
| `optimal_with_uncertainty_penalty.realised_cost` | 103.25 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.297 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 23.95 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 12.578 |
| `oracle_true_costs.realised_cost` | 91.711 |
| `oracle_true_costs.promised_cost` | 95.6 |
| `oracle_true_costs.optimism_gap_pct` | -4.0677 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
