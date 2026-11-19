# Ad Spend Forecasting & Budget Allocation: worked example

> Run on synthetic data with `optimize` engine, seed 56951, knobs {"n_instances": 186, "noise": 0.332}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints.

**Constraints that shape the design.** Minimum commitments; Response curves; Daily rebalance

**Label in this use case.** For "Ad Spend Forecasting & Budget Allocation": Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational curves confounded by bidding changes.

## 2. Choose the signals

Your strongest signal is **Marginal ROI** (derivative of response curve). Its rule: Estimation. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 42.9% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 38.1% worse than the oracle plan; optimal assignment on predictions is 21.6% worse; adding an uncertainty penalty gives 17.1%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 38.1% |
| Regret versus oracle, optimal on predictions | 21.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 17.1% |
| Promised versus realised cost gap, optimal on predictions | 42.9% |

## 5. An edge case from the blueprint

**Sparse data for new campaigns.** new campaigns have little data so fitted response curves are wild and misallocate budget. Planned response: Hierarchical priors from similar campaigns. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 186 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 127 |
| `greedy_on_predictions.promised_cost` | 97.363 |
| `greedy_on_predictions.optimism_gap_pct` | 30.445 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 38.143 |
| `optimal_on_predictions.realised_cost` | 111.78 |
| `optimal_on_predictions.promised_cost` | 78.214 |
| `optimal_on_predictions.optimism_gap_pct` | 42.915 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 21.581 |
| `optimal_with_uncertainty_penalty.realised_cost` | 107.69 |
| `optimal_with_uncertainty_penalty.promised_cost` | 80.368 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 33.993 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 17.131 |
| `oracle_true_costs.realised_cost` | 91.937 |
| `oracle_true_costs.promised_cost` | 97.283 |
| `oracle_true_costs.optimism_gap_pct` | -5.4952 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
