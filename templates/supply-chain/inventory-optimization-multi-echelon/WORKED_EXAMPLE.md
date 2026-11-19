# Multi-Echelon Inventory Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 25670, knobs {"n_instances": 105, "noise": 0.277}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment.

**Constraints that shape the design.** Lead-time variability; Echelon service levels; Working-capital targets

**Label in this use case.** For "Multi-Echelon Inventory Optimisation": Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Normal-distribution assumptions on skewed demand.

## 2. Choose the signals

Your strongest signal is **Demand forecast error distribution** (residuals by horizon). Its rule: Forecast backtest. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 29.1% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 32.5% worse than the oracle plan; optimal assignment on predictions is 15.4% worse; adding an uncertainty penalty gives 12.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 32.5% |
| Regret versus oracle, optimal on predictions | 15.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 12.6% |
| Promised versus realised cost gap, optimal on predictions | 29.1% |

## 5. An edge case from the blueprint

**Single-sourced component disrupted.** policy assumes normal lead times. Planned response: Disruption scenarios in optimisation. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 105 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 121.08 |
| `greedy_on_predictions.promised_cost` | 100.13 |
| `greedy_on_predictions.optimism_gap_pct` | 20.927 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 32.502 |
| `optimal_on_predictions.realised_cost` | 105.48 |
| `optimal_on_predictions.promised_cost` | 81.686 |
| `optimal_on_predictions.optimism_gap_pct` | 29.129 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 15.429 |
| `optimal_with_uncertainty_penalty.realised_cost` | 102.91 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.239 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 23.63 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 12.614 |
| `oracle_true_costs.realised_cost` | 91.382 |
| `oracle_true_costs.promised_cost` | 94.672 |
| `oracle_true_costs.optimism_gap_pct` | -3.4755 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
