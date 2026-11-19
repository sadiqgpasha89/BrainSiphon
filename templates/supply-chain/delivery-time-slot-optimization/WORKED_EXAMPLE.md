# Delivery Time-Slot Pricing & Allocation: worked example

> Run on synthetic data with `optimize` engine, seed 9017, knobs {"n_instances": 189, "noise": 0.413}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion.

**Constraints that shape the design.** Capacity per slot; Fairness in pricing; 50 ms

**Label in this use case.** For "Delivery Time-Slot Pricing & Allocation": Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation uses fixed demand regardless of price.

## 2. Choose the signals

Your strongest signal is **Marginal insertion cost** (extra route time of the new stop). Its rule: Routes as-of. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 67.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 45.9% worse than the oracle plan; optimal assignment on predictions is 31.1% worse; adding an uncertainty penalty gives 24.3%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 45.9% |
| Regret versus oracle, optimal on predictions | 31.1% |
| Regret versus oracle, optimal with an uncertainty penalty | 24.3% |
| Promised versus realised cost gap, optimal on predictions | 67.2% |

## 5. An edge case from the blueprint

**Cost estimates stale as routes change.** slots mispriced. Planned response: Short cache TTL and cost refresh triggers. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 189 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 134.32 |
| `greedy_on_predictions.promised_cost` | 92.201 |
| `greedy_on_predictions.optimism_gap_pct` | 45.686 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 45.924 |
| `optimal_on_predictions.realised_cost` | 120.69 |
| `optimal_on_predictions.promised_cost` | 72.169 |
| `optimal_on_predictions.optimism_gap_pct` | 67.236 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 31.115 |
| `optimal_with_uncertainty_penalty.realised_cost` | 114.4 |
| `optimal_with_uncertainty_penalty.promised_cost` | 75.036 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 52.456 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 24.276 |
| `oracle_true_costs.realised_cost` | 92.051 |
| `oracle_true_costs.promised_cost` | 99.176 |
| `oracle_true_costs.optimism_gap_pct` | -7.1842 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
