# Provider Onboarding Cycle-Time Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 65922, knobs {"n_instances": 129, "noise": 0.342}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness.

**Constraints that shape the design.** Owners approve every task reassignment and every start-date change; Critical-path analysis uses explicit dependencies including hard prerequisites such as credentialing; Recommendations never skip a mandatory verification step

**Label in this use case.** For "Provider Onboarding Cycle-Time Optimization": Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learning order from history rather than rules.

## 2. Choose the signals

Your strongest signal is **Critical-path slack** (latest start minus earliest start for each open task). Its rule: Use the dependency graph at scoring time. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 44.2% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.8% worse than the oracle plan; optimal assignment on predictions is 21.6% worse; adding an uncertainty penalty gives 18.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.8% |
| Regret versus oracle, optimal on predictions | 21.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 18.1% |
| Promised versus realised cost gap, optimal on predictions | 44.2% |

## 5. An edge case from the blueprint

**Missing events from one system.** the process looks shorter than it is. Planned response: Event-completeness checks per source before mining. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 129 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 127.25 |
| `greedy_on_predictions.promised_cost` | 96.018 |
| `greedy_on_predictions.optimism_gap_pct` | 32.528 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.77 |
| `optimal_on_predictions.realised_cost` | 111.47 |
| `optimal_on_predictions.promised_cost` | 77.305 |
| `optimal_on_predictions.optimism_gap_pct` | 44.195 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.561 |
| `optimal_with_uncertainty_penalty.realised_cost` | 108.31 |
| `optimal_with_uncertainty_penalty.promised_cost` | 79.565 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 36.134 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 18.119 |
| `oracle_true_costs.realised_cost` | 91.699 |
| `oracle_true_costs.promised_cost` | 96.446 |
| `oracle_true_costs.optimism_gap_pct` | -4.9224 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
