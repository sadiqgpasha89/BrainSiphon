# Order Promising (ATP/CTP) Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 11748, knobs {"n_instances": 113, "noise": 0.347}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility.

**Constraints that shape the design.** Decision in 100 ms; Priority tiers; Allocation rules

**Label in this use case.** For "Order Promising (ATP/CTP) Optimisation": Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulations without demand uncertainty.

## 2. Choose the signals

Your strongest signal is **Available-to-promise by node** (stock net of reservations). Its rule: Real-time. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 45.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.3% worse than the oracle plan; optimal assignment on predictions is 21.9% worse; adding an uncertainty penalty gives 17.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.3% |
| Regret versus oracle, optimal on predictions | 21.9% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.2% |
| Promised versus realised cost gap, optimal on predictions | 45.9% |

## 5. An edge case from the blueprint

**Inventory accuracy issues.** promises broken. Planned response: Inventory confidence buffers. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 113 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.8 |
| `greedy_on_predictions.promised_cost` | 95.302 |
| `greedy_on_predictions.optimism_gap_pct` | 33.047 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.271 |
| `optimal_on_predictions.realised_cost` | 111.82 |
| `optimal_on_predictions.promised_cost` | 76.631 |
| `optimal_on_predictions.optimism_gap_pct` | 45.921 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.94 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.46 |
| `optimal_with_uncertainty_penalty.promised_cost` | 78.79 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 36.391 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.187 |
| `oracle_true_costs.realised_cost` | 91.702 |
| `oracle_true_costs.promised_cost` | 95.852 |
| `oracle_true_costs.optimism_gap_pct` | -4.3306 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
