# Float Pool & Cross-Department Staff Allocation: worked example

> Run on synthetic data with `optimize` engine, seed 14946, knobs {"n_instances": 190, "noise": 0.317}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits.

**Constraints that shape the design.** Hard constraints cover licensure, competency, rest periods, maximum hours and collective-agreement rules; Soft objectives cover continuity, fairness of float burden and cost; Every plan includes the reasons options were rejected

**Label in this use case.** For "Float Pool & Cross-Department Staff Allocation": Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring plans on forecast shortage only.

## 2. Choose the signals

Your strongest signal is **Coverage gain** (reduction in unmet required hours if the person is assigned). Its rule: Use the shortage list at solve time. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 38.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 36.6% worse than the oracle plan; optimal assignment on predictions is 19.3% worse; adding an uncertainty penalty gives 14.9%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 36.6% |
| Regret versus oracle, optimal on predictions | 19.3% |
| Regret versus oracle, optimal with an uncertainty penalty | 14.9% |
| Promised versus realised cost gap, optimal on predictions | 38.2% |

## 5. An edge case from the blueprint

**No feasible plan.** hard constraints leave a shortage uncovered. Planned response: Return the largest feasible partial plan and the binding constraints as escalation reasons. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 190 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 125.18 |
| `greedy_on_predictions.promised_cost` | 97.457 |
| `greedy_on_predictions.optimism_gap_pct` | 28.443 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 36.622 |
| `optimal_on_predictions.realised_cost` | 109.28 |
| `optimal_on_predictions.promised_cost` | 79.097 |
| `optimal_on_predictions.optimism_gap_pct` | 38.163 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 19.276 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.24 |
| `optimal_with_uncertainty_penalty.promised_cost` | 81.071 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 29.813 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 14.864 |
| `oracle_true_costs.realised_cost` | 91.622 |
| `oracle_true_costs.promised_cost` | 95.956 |
| `oracle_true_costs.optimism_gap_pct` | -4.5161 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
