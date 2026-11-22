# Provider Network Expansion Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 38762, knobs {"n_instances": 138, "noise": 0.316}, in 2.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs.

**Constraints that shape the design.** Network strategy and contracting teams decide and the tool makes no contracting offer; Access targets and network rules are constraints; Candidates must pass credentialing and contracting eligibility before they appear

**Label in this use case.** For "Provider Network Expansion Optimization": Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ignoring candidate capacity.

## 2. Choose the signals

Your strongest signal is **Access gain per candidate** (additional members reached within the standard if the candidate joins). Its rule: Gap model snapshot. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 38.1% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 35.3% worse than the oracle plan; optimal assignment on predictions is 19.0% worse; adding an uncertainty penalty gives 15.0%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 35.3% |
| Regret versus oracle, optimal on predictions | 19.0% |
| Regret versus oracle, optimal with an uncertainty penalty | 15.0% |
| Promised versus realised cost gap, optimal on predictions | 38.1% |

## 5. An edge case from the blueprint

**Candidate declines.** the plan changes. Planned response: Re-solve with excluded candidates. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 138 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 124.17 |
| `greedy_on_predictions.promised_cost` | 96.989 |
| `greedy_on_predictions.optimism_gap_pct` | 28.025 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 35.297 |
| `optimal_on_predictions.realised_cost` | 109.17 |
| `optimal_on_predictions.promised_cost` | 79.046 |
| `optimal_on_predictions.optimism_gap_pct` | 38.115 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 18.957 |
| `optimal_with_uncertainty_penalty.realised_cost` | 105.56 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.761 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 30.706 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 15.017 |
| `oracle_true_costs.realised_cost` | 91.777 |
| `oracle_true_costs.promised_cost` | 96.525 |
| `oracle_true_costs.optimism_gap_pct` | -4.919 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
