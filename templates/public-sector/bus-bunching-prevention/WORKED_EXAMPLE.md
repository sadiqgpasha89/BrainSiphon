# Bus Bunching Prevention: worked example

> Run on synthetic data with `optimize` engine, seed 77749, knobs {"n_instances": 148, "noise": 0.449}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules.

**Constraints that shape the design.** Recommendations respect driver hours and safety rules; Controllers approve any intervention; Messages within 10 s

**Label in this use case.** For "Bus Bunching Prevention": Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: On-time at timepoints only.

## 2. Choose the signals

Your strongest signal is **Headway gap to the vehicle ahead** (time gap to the leader). Its rule: From AVL. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 77.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 50.3% worse than the oracle plan; optimal assignment on predictions is 34.6% worse; adding an uncertainty penalty gives 28.2%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 50.3% |
| Regret versus oracle, optimal on predictions | 34.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 28.2% |
| Promised versus realised cost gap, optimal on predictions | 77.2% |

## 5. An edge case from the blueprint

**Traffic incident.** delays occur across a corridor. Planned response: Corridor-wide advice. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 148 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 137.62 |
| `greedy_on_predictions.promised_cost` | 89.84 |
| `greedy_on_predictions.optimism_gap_pct` | 53.184 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 50.299 |
| `optimal_on_predictions.realised_cost` | 123.27 |
| `optimal_on_predictions.promised_cost` | 69.571 |
| `optimal_on_predictions.optimism_gap_pct` | 77.188 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 34.628 |
| `optimal_with_uncertainty_penalty.realised_cost` | 117.39 |
| `optimal_with_uncertainty_penalty.promised_cost` | 72.512 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 61.891 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 28.206 |
| `oracle_true_costs.realised_cost` | 91.564 |
| `oracle_true_costs.promised_cost` | 102.5 |
| `oracle_true_costs.optimism_gap_pct` | -10.673 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
