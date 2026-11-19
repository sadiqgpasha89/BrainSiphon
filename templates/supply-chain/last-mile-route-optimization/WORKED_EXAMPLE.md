# Last-Mile Route Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 28675, knobs {"n_instances": 143, "noise": 0.417}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions.

**Constraints that shape the design.** Time windows; Vehicle capacity; Driver hours

**Label in this use case.** For "Last-Mile Route Optimisation": Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Benchmarks with synthetic service times.

## 2. Choose the signals

Your strongest signal is **Stop service-time model** (predicted minutes per stop by building and parcel type). Its rule: Historical stop data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 68.7% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 46.6% worse than the oracle plan; optimal assignment on predictions is 32.0% worse; adding an uncertainty penalty gives 24.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 46.6% |
| Regret versus oracle, optimal on predictions | 32.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 24.6% |
| Promised versus realised cost gap, optimal on predictions | 68.7% |

## 5. An edge case from the blueprint

**Failed deliveries cascade through the route.** later stops all late. Planned response: Dynamic re-sequencing and buffer insertion. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 143 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 134.63 |
| `greedy_on_predictions.promised_cost` | 91.138 |
| `greedy_on_predictions.optimism_gap_pct` | 47.716 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 46.594 |
| `optimal_on_predictions.realised_cost` | 121.2 |
| `optimal_on_predictions.promised_cost` | 71.829 |
| `optimal_on_predictions.optimism_gap_pct` | 68.732 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 31.972 |
| `optimal_with_uncertainty_penalty.realised_cost` | 114.42 |
| `optimal_with_uncertainty_penalty.promised_cost` | 74.581 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 53.421 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 24.595 |
| `oracle_true_costs.realised_cost` | 91.836 |
| `oracle_true_costs.promised_cost` | 99.639 |
| `oracle_true_costs.optimism_gap_pct` | -7.8313 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
