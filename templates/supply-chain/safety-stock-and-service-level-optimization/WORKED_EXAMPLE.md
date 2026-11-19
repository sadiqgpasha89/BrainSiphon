# Safety Stock & Service-Level Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 88746, knobs {"n_instances": 113, "noise": 0.343}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Allocate a working-capital budget to safety stock across SKUs to maximise overall service level.

**Constraints that shape the design.** Budget cap; Service differentiation; Intermittent demand

**Label in this use case.** For "Safety Stock & Service-Level Optimisation": Allocate a working-capital budget to safety stock across SKUs to maximise overall service level. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Normality assumed.

## 2. Choose the signals

Your strongest signal is **Demand over lead time distribution** (simulated convolution). Its rule: Lead-time data. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 45.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.4% worse than the oracle plan; optimal assignment on predictions is 23.2% worse; adding an uncertainty penalty gives 18.7%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.4% |
| Regret versus oracle, optimal on predictions | 23.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 18.7% |
| Promised versus realised cost gap, optimal on predictions | 45.4% |

## 5. An edge case from the blueprint

**Item with few demand observations.** unstable distribution. Planned response: Hierarchical pooling and minimum-data rules. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 113 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.84 |
| `greedy_on_predictions.promised_cost` | 96.819 |
| `greedy_on_predictions.optimism_gap_pct` | 31.011 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.422 |
| `optimal_on_predictions.realised_cost` | 112.92 |
| `optimal_on_predictions.promised_cost` | 77.677 |
| `optimal_on_predictions.optimism_gap_pct` | 45.372 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 23.229 |
| `optimal_with_uncertainty_penalty.realised_cost` | 108.75 |
| `optimal_with_uncertainty_penalty.promised_cost` | 79.93 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 36.062 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 18.682 |
| `oracle_true_costs.realised_cost` | 91.636 |
| `oracle_true_costs.promised_cost` | 97.273 |
| `oracle_true_costs.optimism_gap_pct` | -5.7952 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
