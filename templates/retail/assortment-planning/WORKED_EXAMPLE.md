# Assortment Planning & Space Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 90337, knobs {"n_instances": 185, "noise": 0.39}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand.

**Constraints that shape the design.** Shelf space per store; Vendor commitments; Local preferences

**Label in this use case.** For "Assortment Planning & Space Optimisation": Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using sales as demand when items were unavailable.

## 2. Choose the signals

Your strongest signal is **Substitution matrix** (estimated demand transfer between SKUs). Its rule: Estimated from stock-out natural experiments. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 57.8% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 43.1% worse than the oracle plan; optimal assignment on predictions is 27.9% worse; adding an uncertainty penalty gives 22.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 43.1% |
| Regret versus oracle, optimal on predictions | 27.9% |
| Regret versus oracle, optimal with an uncertainty penalty | 22.2% |
| Promised versus realised cost gap, optimal on predictions | 57.8% |

## 5. An edge case from the blueprint

**Out-of-stock events distort demand.** censored sales bias results. Planned response: Stock-out correction in estimation. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 185 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 131.01 |
| `greedy_on_predictions.promised_cost` | 92.398 |
| `greedy_on_predictions.optimism_gap_pct` | 41.791 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 43.062 |
| `optimal_on_predictions.realised_cost` | 117.1 |
| `optimal_on_predictions.promised_cost` | 74.197 |
| `optimal_on_predictions.optimism_gap_pct` | 57.818 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 27.866 |
| `optimal_with_uncertainty_penalty.realised_cost` | 111.88 |
| `optimal_with_uncertainty_penalty.promised_cost` | 76.751 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 45.768 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 22.169 |
| `oracle_true_costs.realised_cost` | 91.577 |
| `oracle_true_costs.promised_cost` | 98.686 |
| `oracle_true_costs.optimism_gap_pct` | -7.204 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
