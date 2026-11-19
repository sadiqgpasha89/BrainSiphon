# Robo-Advisor Portfolio Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 12081, knobs {"n_instances": 145, "noise": 0.262}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs.

**Constraints that shape the design.** Suitability rules per jurisdiction; Fractional shares; Tax-lot awareness

**Label in this use case.** For "Robo-Advisor Portfolio Optimization": Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtest ignores taxes and transaction costs.

## 2. Choose the signals

Your strongest signal is **Shrunk covariance matrix** (Ledoit-Wolf shrinkage on rolling returns). Its rule: Rolling window must not include rebalance date. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 26.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 31.1% worse than the oracle plan; optimal assignment on predictions is 14.2% worse; adding an uncertainty penalty gives 11.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 31.1% |
| Regret versus oracle, optimal on predictions | 14.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 11.5% |
| Promised versus realised cost gap, optimal on predictions | 26.9% |

## 5. An edge case from the blueprint

**Market crash with synchronized rebalancing.** trading storms into illiquid ETFs. Planned response: Staggered cohorts and liquidity-aware order slicing. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 145 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 120.49 |
| `greedy_on_predictions.promised_cost` | 100.89 |
| `greedy_on_predictions.optimism_gap_pct` | 19.422 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 31.124 |
| `optimal_on_predictions.realised_cost` | 104.98 |
| `optimal_on_predictions.promised_cost` | 82.723 |
| `optimal_on_predictions.optimism_gap_pct` | 26.908 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 14.246 |
| `optimal_with_uncertainty_penalty.realised_cost` | 102.47 |
| `optimal_with_uncertainty_penalty.promised_cost` | 84.016 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 21.962 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 11.511 |
| `oracle_true_costs.realised_cost` | 91.89 |
| `oracle_true_costs.promised_cost` | 94.611 |
| `oracle_true_costs.optimism_gap_pct` | -2.8755 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
