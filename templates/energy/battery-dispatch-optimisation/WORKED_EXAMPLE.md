# Battery Dispatch Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 56670, knobs {"n_instances": 139, "noise": 0.318}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits.

**Constraints that shape the design.** State of charge and power limits enforced in the controller; Degradation cost in the objective; Warranty and grid connection limits respected

**Label in this use case.** For "Battery Dispatch Optimisation": Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Revenue-only objectives.

## 2. Choose the signals

Your strongest signal is **Price and ancillary scenarios** (scenario set from the price models). Its rule: From forecasts. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 38.8% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 37.4% worse than the oracle plan; optimal assignment on predictions is 19.7% worse; adding an uncertainty penalty gives 15.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 37.4% |
| Regret versus oracle, optimal on predictions | 19.7% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.6% |
| Promised versus realised cost gap, optimal on predictions | 38.8% |

## 5. An edge case from the blueprint

**Forecast miss.** prices move against the plan. Planned response: Rolling horizon and reserve margins. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 139 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 125.63 |
| `greedy_on_predictions.promised_cost` | 97.599 |
| `greedy_on_predictions.optimism_gap_pct` | 28.725 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 37.36 |
| `optimal_on_predictions.realised_cost` | 109.49 |
| `optimal_on_predictions.promised_cost` | 78.909 |
| `optimal_on_predictions.optimism_gap_pct` | 38.757 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 19.711 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.69 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.817 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 30.778 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.556 |
| `oracle_true_costs.realised_cost` | 91.463 |
| `oracle_true_costs.promised_cost` | 95.859 |
| `oracle_true_costs.optimism_gap_pct` | -4.5856 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
