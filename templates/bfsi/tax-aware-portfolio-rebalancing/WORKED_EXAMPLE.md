# Tax-Aware Portfolio Rebalancing: worked example

> Run on synthetic data with `optimize` engine, seed 41334, knobs {"n_instances": 125, "noise": 0.331}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost.

**Constraints that shape the design.** Respect client restrictions and wash-sale rules; Trade lists explainable to the advisor; Daily scan, monthly trading

**Label in this use case.** For "Tax-Aware Portfolio Rebalancing": Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Back-test ignores lot constraints.

## 2. Choose the signals

Your strongest signal is **Drift versus band** (allocation minus target relative to the band). Its rule: Targets change. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 43.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.1% worse than the oracle plan; optimal assignment on predictions is 22.1% worse; adding an uncertainty penalty gives 17.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.1% |
| Regret versus oracle, optimal on predictions | 22.1% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.5% |
| Promised versus realised cost gap, optimal on predictions | 43.4% |

## 5. An edge case from the blueprint

**Wash-sale.** repurchase within the window. Planned response: Window tracking across accounts. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 125 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 126.38 |
| `greedy_on_predictions.promised_cost` | 96.615 |
| `greedy_on_predictions.optimism_gap_pct` | 30.802 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.15 |
| `optimal_on_predictions.realised_cost` | 111.71 |
| `optimal_on_predictions.promised_cost` | 77.921 |
| `optimal_on_predictions.optimism_gap_pct` | 43.366 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 22.121 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.51 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.039 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 34.316 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.522 |
| `oracle_true_costs.realised_cost` | 91.477 |
| `oracle_true_costs.promised_cost` | 96.682 |
| `oracle_true_costs.optimism_gap_pct` | -5.3836 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
