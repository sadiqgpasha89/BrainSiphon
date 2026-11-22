# Healthcare Purchase Demand Consolidation Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 8084, knobs {"n_instances": 179, "noise": 0.26}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies.

**Constraints that shape the design.** Buyers approve orders and critical supplies keep safety-stock constraints; Hard constraints cover supplier minimums, lead times, shelf life, storage and contract terms; The plan explains each constraint that binds

**Label in this use case.** For "Healthcare Purchase Demand Consolidation Optimization": Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising price while ignoring holding cost.

## 2. Choose the signals

Your strongest signal is **Forecast demand with uncertainty** (expected demand and variance per item and facility). Its rule: Forecast snapshot at planning time. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 26.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 31.5% worse than the oracle plan; optimal assignment on predictions is 14.0% worse; adding an uncertainty penalty gives 11.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 31.5% |
| Regret versus oracle, optimal on predictions | 14.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 11.2% |
| Promised versus realised cost gap, optimal on predictions | 26.3% |

## 5. An edge case from the blueprint

**Supplier minimum cannot be met.** no feasible consolidation. Planned response: Relax only soft costs and show the binding minimum. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 179 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 120.06 |
| `greedy_on_predictions.promised_cost` | 100.26 |
| `greedy_on_predictions.optimism_gap_pct` | 19.757 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 31.457 |
| `optimal_on_predictions.realised_cost` | 104.15 |
| `optimal_on_predictions.promised_cost` | 82.434 |
| `optimal_on_predictions.optimism_gap_pct` | 26.338 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 14.029 |
| `optimal_with_uncertainty_penalty.realised_cost` | 101.58 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.779 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 21.247 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 11.219 |
| `oracle_true_costs.realised_cost` | 91.333 |
| `oracle_true_costs.promised_cost` | 94.355 |
| `oracle_true_costs.optimism_gap_pct` | -3.2037 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
