# Evacuation Route Planning: worked example

> Run on synthetic data with `optimize` engine, seed 18110, knobs {"n_instances": 194, "noise": 0.263}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans.

**Constraints that shape the design.** Plans consider residents with mobility needs from consented registers; Commanders approve every instruction; Simulations compare plans in minutes

**Label in this use case.** For "Evacuation Route Planning": Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Free-flow assumptions.

## 2. Choose the signals

Your strongest signal is **Road capacity and closures** (live capacity of roads). Its rule: From traffic data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 26.5% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 30.3% worse than the oracle plan; optimal assignment on predictions is 13.6% worse; adding an uncertainty penalty gives 11.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 30.3% |
| Regret versus oracle, optimal on predictions | 13.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 11.2% |
| Promised versus realised cost gap, optimal on predictions | 26.5% |

## 5. An edge case from the blueprint

**Blocked road.** a planned route is cut by a hazard. Planned response: Live replanning. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 194 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 118.89 |
| `greedy_on_predictions.promised_cost` | 99.401 |
| `greedy_on_predictions.optimism_gap_pct` | 19.61 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 30.32 |
| `optimal_on_predictions.realised_cost` | 103.68 |
| `optimal_on_predictions.promised_cost` | 81.985 |
| `optimal_on_predictions.optimism_gap_pct` | 26.459 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 13.641 |
| `optimal_with_uncertainty_penalty.realised_cost` | 101.45 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.307 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 21.78 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 11.201 |
| `oracle_true_costs.realised_cost` | 91.232 |
| `oracle_true_costs.promised_cost` | 93.885 |
| `oracle_true_costs.optimism_gap_pct` | -2.8256 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
