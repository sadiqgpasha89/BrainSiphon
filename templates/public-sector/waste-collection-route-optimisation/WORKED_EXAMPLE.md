# Waste Collection Route Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 23268, knobs {"n_instances": 123, "noise": 0.369}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall.

**Constraints that shape the design.** Collection frequency rules and service promises respected; Driver hours and vehicle capacity as hard limits; Supervisors approve routes

**Label in this use case.** For "Waste Collection Route Optimisation": Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Distance-only objectives.

## 2. Choose the signals

Your strongest signal is **Bin fill estimate** (estimated fill by bin). Its rule: From sensors and models. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 53.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 40.1% worse than the oracle plan; optimal assignment on predictions is 26.4% worse; adding an uncertainty penalty gives 20.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 40.1% |
| Regret versus oracle, optimal on predictions | 26.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 20.7% |
| Promised versus realised cost gap, optimal on predictions | 53.2% |

## 5. An edge case from the blueprint

**Sensor failure.** fill data is missing. Planned response: Historic fill profiles and flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 123 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 128.61 |
| `greedy_on_predictions.promised_cost` | 94.119 |
| `greedy_on_predictions.optimism_gap_pct` | 36.645 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 40.069 |
| `optimal_on_predictions.realised_cost` | 116.1 |
| `optimal_on_predictions.promised_cost` | 75.809 |
| `optimal_on_predictions.optimism_gap_pct` | 53.152 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 26.449 |
| `optimal_with_uncertainty_penalty.realised_cost` | 110.86 |
| `optimal_with_uncertainty_penalty.promised_cost` | 78.101 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 41.946 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 20.739 |
| `oracle_true_costs.realised_cost` | 91.818 |
| `oracle_true_costs.promised_cost` | 99.382 |
| `oracle_true_costs.optimism_gap_pct` | -7.6107 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
