# Field Technician Dispatch Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 11104, knobs {"n_instances": 157, "noise": 0.328}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel.

**Constraints that shape the design.** Skills, parts and working-time rules as hard constraints; Re-optimisation within 60 s after a change; Dispatcher can override

**Label in this use case.** For "Field Technician Dispatch Optimisation": Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed standard times.

## 2. Choose the signals

Your strongest signal is **Predicted job duration** (model of duration by job type, site and technician skill). Its rule: Use confirmed durations. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 42.8% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.3% worse than the oracle plan; optimal assignment on predictions is 21.8% worse; adding an uncertainty penalty gives 17.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.3% |
| Regret versus oracle, optimal on predictions | 21.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.1% |
| Promised versus realised cost gap, optimal on predictions | 42.8% |

## 5. An edge case from the blueprint

**Emergency job.** the day plan is disrupted. Planned response: Priority insertion and re-optimisation with minimal change. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 157 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 125.19 |
| `greedy_on_predictions.promised_cost` | 97.338 |
| `greedy_on_predictions.optimism_gap_pct` | 28.614 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.341 |
| `optimal_on_predictions.realised_cost` | 111.82 |
| `optimal_on_predictions.promised_cost` | 78.285 |
| `optimal_on_predictions.optimism_gap_pct` | 42.836 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.78 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.48 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.478 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 33.554 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.056 |
| `oracle_true_costs.realised_cost` | 91.821 |
| `oracle_true_costs.promised_cost` | 96.905 |
| `oracle_true_costs.optimism_gap_pct` | -5.2465 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
