# Fleet Planning & Vehicle Routing with Time Windows: worked example

> Run on synthetic data with `optimize` engine, seed 72061, knobs {"n_instances": 167, "noise": 0.328}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints.

**Constraints that shape the design.** Planning window of 2 hours overnight; Mixed fleets; Regulations on hours

**Label in this use case.** For "Fleet Planning & Vehicle Routing with Time Windows": Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learning on small instances and testing on large ones.

## 2. Choose the signals

Your strongest signal is **Demand uncertainty scenarios** (sampled order volumes per lane). Its rule: Scenario generation model. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 42.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.2% worse than the oracle plan; optimal assignment on predictions is 21.4% worse; adding an uncertainty penalty gives 17.4%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.2% |
| Regret versus oracle, optimal on predictions | 21.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.4% |
| Promised versus realised cost gap, optimal on predictions | 42.2% |

## 5. An edge case from the blueprint

**Vehicle breakdown mid-plan.** stops assigned to the broken vehicle go unserved until a manual recovery plan exists. Planned response: Fast local repair and spare capacity pool. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 167 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.9 |
| `greedy_on_predictions.promised_cost` | 98.053 |
| `greedy_on_predictions.optimism_gap_pct` | 29.416 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.23 |
| `optimal_on_predictions.realised_cost` | 111.44 |
| `optimal_on_predictions.promised_cost` | 78.388 |
| `optimal_on_predictions.optimism_gap_pct` | 42.168 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.397 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.77 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.295 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 34.212 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.391 |
| `oracle_true_costs.realised_cost` | 91.8 |
| `oracle_true_costs.promised_cost` | 97.087 |
| `oracle_true_costs.optimism_gap_pct` | -5.4453 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
