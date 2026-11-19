# Inventory Replenishment Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 42382, knobs {"n_instances": 165, "noise": 0.326}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost.

**Constraints that shape the design.** Supplier MOQ and lead times; Shelf-life limits; Warehouse capacity

**Label in this use case.** For "Inventory Replenishment Optimisation": Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation uses forecast with look-ahead.

## 2. Choose the signals

Your strongest signal is **Lead-time distribution** (empirical supplier lead-time quantiles). Its rule: Use delivered, not promised, dates. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 39.5% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 37.7% worse than the oracle plan; optimal assignment on predictions is 20.0% worse; adding an uncertainty penalty gives 16.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 37.7% |
| Regret versus oracle, optimal on predictions | 20.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 16.7% |
| Promised versus realised cost gap, optimal on predictions | 39.5% |

## 5. An edge case from the blueprint

**Supplier disruption.** lead times double. Planned response: Disruption flags widen distributions and trigger alternate sourcing. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 165 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.03 |
| `greedy_on_predictions.promised_cost` | 97.392 |
| `greedy_on_predictions.optimism_gap_pct` | 29.402 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 37.651 |
| `optimal_on_predictions.realised_cost` | 109.91 |
| `optimal_on_predictions.promised_cost` | 78.765 |
| `optimal_on_predictions.optimism_gap_pct` | 39.542 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 20.047 |
| `optimal_with_uncertainty_penalty.realised_cost` | 106.83 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.625 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 32.501 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 16.682 |
| `oracle_true_costs.realised_cost` | 91.556 |
| `oracle_true_costs.promised_cost` | 96.534 |
| `oracle_true_costs.optimism_gap_pct` | -5.1565 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
