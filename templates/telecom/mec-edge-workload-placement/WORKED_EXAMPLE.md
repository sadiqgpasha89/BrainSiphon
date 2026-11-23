# MEC Edge Workload Placement: worked example

> Run on synthetic data with `optimize` engine, seed 11252, knobs {"n_instances": 102, "noise": 0.401}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity.

**Constraints that shape the design.** Placement honours latency and data-residency constraints; Moves cause no service interruption; Human approval for new tenants

**Label in this use case.** For "MEC Edge Workload Placement": Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Cost-only placement.

## 2. Choose the signals

Your strongest signal is **Latency to users** (measured latency from the user population to each site). Its rule: Live measurements. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 62.6% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 43.6% worse than the oracle plan; optimal assignment on predictions is 29.0% worse; adding an uncertainty penalty gives 21.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 43.6% |
| Regret versus oracle, optimal on predictions | 29.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 21.8% |
| Promised versus realised cost gap, optimal on predictions | 62.6% |

## 5. An edge case from the blueprint

**Demand spike at one site.** capacity runs out. Planned response: Overflow rules and quick scaling. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 102 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 132.28 |
| `greedy_on_predictions.promised_cost` | 91.685 |
| `greedy_on_predictions.optimism_gap_pct` | 44.281 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 43.631 |
| `optimal_on_predictions.realised_cost` | 118.82 |
| `optimal_on_predictions.promised_cost` | 73.064 |
| `optimal_on_predictions.optimism_gap_pct` | 62.628 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 29.016 |
| `optimal_with_uncertainty_penalty.realised_cost` | 112.22 |
| `optimal_with_uncertainty_penalty.promised_cost` | 75.618 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 48.399 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 21.843 |
| `oracle_true_costs.realised_cost` | 92.1 |
| `oracle_true_costs.promised_cost` | 101.06 |
| `oracle_true_costs.optimism_gap_pct` | -8.864 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
