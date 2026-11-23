# CI Queue and Resource Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 27969, knobs {"n_instances": 177, "noise": 0.32}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation.

**Constraints that shape the design.** Release and hotfix jobs always have priority; Budget caps on compute; Scheduling decision within 1 s

**Label in this use case.** For "CI Queue and Resource Optimisation": Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Utilisation as the goal.

## 2. Choose the signals

Your strongest signal is **Queue depth and wait time** (pending jobs and waiting time). Its rule: From the scheduler. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 40.1% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.3% worse than the oracle plan; optimal assignment on predictions is 20.3% worse; adding an uncertainty penalty gives 16.3%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.3% |
| Regret versus oracle, optimal on predictions | 20.3% |
| Regret versus oracle, optimal with an uncertainty penalty | 16.3% |
| Promised versus realised cost gap, optimal on predictions | 40.1% |

## 5. An edge case from the blueprint

**Surge after a release.** many jobs arrive. Planned response: Burst capacity and priority lanes. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 177 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.89 |
| `greedy_on_predictions.promised_cost` | 95.741 |
| `greedy_on_predictions.optimism_gap_pct` | 30.446 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.348 |
| `optimal_on_predictions.realised_cost` | 110.16 |
| `optimal_on_predictions.promised_cost` | 78.659 |
| `optimal_on_predictions.optimism_gap_pct` | 40.051 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 20.269 |
| `optimal_with_uncertainty_penalty.realised_cost` | 106.52 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.49 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 32.337 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 16.29 |
| `oracle_true_costs.realised_cost` | 91.597 |
| `oracle_true_costs.promised_cost` | 95.761 |
| `oracle_true_costs.optimism_gap_pct` | -4.3485 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
