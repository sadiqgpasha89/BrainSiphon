# Cross-Channel Budget Allocation with Bandits: worked example

> Run on synthetic data with `optimize` engine, seed 61278, knobs {"n_instances": 111, "noise": 0.329}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes.

**Constraints that shape the design.** Channel minimums; Measurement lag; Interference between channels

**Label in this use case.** For "Cross-Channel Budget Allocation with Bandits": Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using platform-reported conversions as rewards.

## 2. Choose the signals

Your strongest signal is **Channel incremental ROAS** (experiment-based). Its rule: Experiments. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 41.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.0% worse than the oracle plan; optimal assignment on predictions is 21.6% worse; adding an uncertainty penalty gives 17.0%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.0% |
| Regret versus oracle, optimal on predictions | 21.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.0% |
| Promised versus realised cost gap, optimal on predictions | 41.9% |

## 5. An edge case from the blueprint

**Measurement lag hides negative effect of a shift.** damage found weeks late. Planned response: Gradual shifts with early-warning guardrails. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 111 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.3 |
| `greedy_on_predictions.promised_cost` | 97.336 |
| `greedy_on_predictions.optimism_gap_pct` | 29.759 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.049 |
| `optimal_on_predictions.realised_cost` | 111.22 |
| `optimal_on_predictions.promised_cost` | 78.381 |
| `optimal_on_predictions.optimism_gap_pct` | 41.893 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.56 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.06 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.383 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 33.192 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.021 |
| `oracle_true_costs.realised_cost` | 91.491 |
| `oracle_true_costs.promised_cost` | 95.8 |
| `oracle_true_costs.optimism_gap_pct` | -4.4984 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
