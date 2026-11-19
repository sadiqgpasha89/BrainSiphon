# Warehouse Slotting Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 74193, knobs {"n_instances": 116, "noise": 0.381}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns.

**Constraints that shape the design.** Heavy items low; Hazmat segregation; Re-slotting labour cost

**Label in this use case.** For "Warehouse Slotting Optimisation": Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Travel savings ignoring congestion.

## 2. Choose the signals

Your strongest signal is **Pick frequency forecast** (expected picks per SKU next 4 weeks). Its rule: Forecast as-of. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 54.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 41.0% worse than the oracle plan; optimal assignment on predictions is 25.3% worse; adding an uncertainty penalty gives 19.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 41.0% |
| Regret versus oracle, optimal on predictions | 25.3% |
| Regret versus oracle, optimal with an uncertainty penalty | 19.7% |
| Promised versus realised cost gap, optimal on predictions | 54.4% |

## 5. An edge case from the blueprint

**Seasonal assortment changes.** slotting stale within weeks. Planned response: Seasonal triggers and rolling re-slot windows. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 116 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 130 |
| `greedy_on_predictions.promised_cost` | 93.106 |
| `greedy_on_predictions.optimism_gap_pct` | 39.629 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 41.025 |
| `optimal_on_predictions.realised_cost` | 115.54 |
| `optimal_on_predictions.promised_cost` | 74.811 |
| `optimal_on_predictions.optimism_gap_pct` | 54.444 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 25.335 |
| `optimal_with_uncertainty_penalty.realised_cost` | 110.38 |
| `optimal_with_uncertainty_penalty.promised_cost` | 77.282 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 42.83 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 19.739 |
| `oracle_true_costs.realised_cost` | 92.185 |
| `oracle_true_costs.promised_cost` | 98.759 |
| `oracle_true_costs.optimism_gap_pct` | -6.657 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
