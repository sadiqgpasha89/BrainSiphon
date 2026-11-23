# Crew and Equipment Scheduling: worked example

> Run on synthetic data with `optimize` engine, seed 41250, knobs {"n_instances": 123, "noise": 0.289}, in 1.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve.

**Constraints that shape the design.** Labour rules and rest periods respected; Safety limits on lifts and zones enforced; Planners approve the plan

**Label in this use case.** For "Crew and Equipment Scheduling": Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Utilisation alone.

## 2. Choose the signals

Your strongest signal is **Activity demand** (work and crew type needed). Its rule: From the schedule. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 32.0% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 33.9% worse than the oracle plan; optimal assignment on predictions is 16.2% worse; adding an uncertainty penalty gives 13.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 33.9% |
| Regret versus oracle, optimal on predictions | 16.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 13.5% |
| Promised versus realised cost gap, optimal on predictions | 32.0% |

## 5. An edge case from the blueprint

**Equipment failure.** a crane is out of service. Planned response: Alternative plans. Write the test that replays this case through your pipeline before you tune anything.

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
| `greedy_on_predictions.realised_cost` | 122.47 |
| `greedy_on_predictions.promised_cost` | 99.024 |
| `greedy_on_predictions.optimism_gap_pct` | 23.678 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 33.88 |
| `optimal_on_predictions.realised_cost` | 106.3 |
| `optimal_on_predictions.promised_cost` | 80.508 |
| `optimal_on_predictions.optimism_gap_pct` | 32.042 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 16.208 |
| `optimal_with_uncertainty_penalty.realised_cost` | 103.84 |
| `optimal_with_uncertainty_penalty.promised_cost` | 82.177 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 26.366 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 13.517 |
| `oracle_true_costs.realised_cost` | 91.478 |
| `oracle_true_costs.promised_cost` | 94.643 |
| `oracle_true_costs.optimism_gap_pct` | -3.3435 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
