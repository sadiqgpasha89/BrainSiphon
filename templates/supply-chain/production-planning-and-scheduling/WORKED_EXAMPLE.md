# Production Planning & Shop-Floor Scheduling: worked example

> Run on synthetic data with `optimize` engine, seed 41937, knobs {"n_instances": 119, "noise": 0.284}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders.

**Constraints that shape the design.** Machine eligibility; Changeover matrices; Due dates

**Label in this use case.** For "Production Planning & Shop-Floor Scheduling": Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using actual processing times known after the fact.

## 2. Choose the signals

Your strongest signal is **Setup time matrix** (changeover durations). Its rule: MES data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 31.3% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 32.9% worse than the oracle plan; optimal assignment on predictions is 16.8% worse; adding an uncertainty penalty gives 13.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 32.9% |
| Regret versus oracle, optimal on predictions | 16.8% |
| Regret versus oracle, optimal with an uncertainty penalty | 13.7% |
| Promised versus realised cost gap, optimal on predictions | 31.3% |

## 5. An edge case from the blueprint

**Machine breakdown.** schedule infeasible. Planned response: Reactive re-sequencing and spare capacity rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 119 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 121.78 |
| `greedy_on_predictions.promised_cost` | 99.103 |
| `greedy_on_predictions.optimism_gap_pct` | 22.881 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 32.928 |
| `optimal_on_predictions.realised_cost` | 107.01 |
| `optimal_on_predictions.promised_cost` | 81.527 |
| `optimal_on_predictions.optimism_gap_pct` | 31.263 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 16.811 |
| `optimal_with_uncertainty_penalty.realised_cost` | 104.13 |
| `optimal_with_uncertainty_penalty.promised_cost` | 83.282 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 25.036 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 13.665 |
| `oracle_true_costs.realised_cost` | 91.613 |
| `oracle_true_costs.promised_cost` | 95.375 |
| `oracle_true_costs.optimism_gap_pct` | -3.9439 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
