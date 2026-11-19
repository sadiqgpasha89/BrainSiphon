# Reinsurance Treaty Allocation Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 13782, knobs {"n_instances": 101, "noise": 0.427}, in 0.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium.

**Constraints that shape the design.** Treaty limits and counterparty credit limits; Board risk appetite; Annual renewal cycle

**Label in this use case.** For "Reinsurance Treaty Allocation Optimisation": Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising against one simulation set.

## 2. Choose the signals

Your strongest signal is **Loss distribution by line** (simulated gross losses). Its rule: Model risk. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 70.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 48.1% worse than the oracle plan; optimal assignment on predictions is 32.7% worse; adding an uncertainty penalty gives 26.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 48.1% |
| Regret versus oracle, optimal on predictions | 32.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 26.1% |
| Promised versus realised cost gap, optimal on predictions | 70.3% |

## 5. An edge case from the blueprint

**Hard market.** A hard reinsurance market raises prices sharply and the planned programme becomes too expensive. Planned response: Re-solve with price-shock scenarios and show the board the capital relief per extra premium unit. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 101 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 135.68 |
| `greedy_on_predictions.promised_cost` | 91.787 |
| `greedy_on_predictions.optimism_gap_pct` | 47.822 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 48.115 |
| `optimal_on_predictions.realised_cost` | 121.6 |
| `optimal_on_predictions.promised_cost` | 71.397 |
| `optimal_on_predictions.optimism_gap_pct` | 70.31 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 32.74 |
| `optimal_with_uncertainty_penalty.realised_cost` | 115.53 |
| `optimal_with_uncertainty_penalty.promised_cost` | 74.085 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 55.947 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 26.12 |
| `oracle_true_costs.realised_cost` | 91.606 |
| `oracle_true_costs.promised_cost` | 99.438 |
| `oracle_true_costs.optimism_gap_pct` | -7.8766 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
