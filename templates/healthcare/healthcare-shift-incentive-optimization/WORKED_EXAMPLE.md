# Healthcare Shift Incentive Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 71959, knobs {"n_instances": 137, "noise": 0.293}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy.

**Constraints that shape the design.** Offers only from the approved incentive menu and within caps; Recommended incentives never create unequal pay for equal circumstances beyond policy; Randomised experimentation only with HR and legal approval and with a ceiling on exposure

**Label in this use case.** For "Healthcare Shift Incentive Optimization": Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating raw acceptance as incentive effect.

## 2. Choose the signals

Your strongest signal is **Urgency** (hours to shift start and unmet required hours). Its rule: Use time of the offer. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 33.4% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 33.9% worse than the oracle plan; optimal assignment on predictions is 17.6% worse; adding an uncertainty penalty gives 13.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 33.9% |
| Regret versus oracle, optimal on predictions | 17.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 13.5% |
| Promised versus realised cost gap, optimal on predictions | 33.4% |

## 5. An edge case from the blueprint

**Budget exhausted mid-period.** later shifts get no incentive. Planned response: Pacing rule that spreads budget across the period with a reserve for critical shifts. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 137 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 123.18 |
| `greedy_on_predictions.promised_cost` | 98.949 |
| `greedy_on_predictions.optimism_gap_pct` | 24.485 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 33.935 |
| `optimal_on_predictions.realised_cost` | 108.17 |
| `optimal_on_predictions.promised_cost` | 81.09 |
| `optimal_on_predictions.optimism_gap_pct` | 33.39 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 17.613 |
| `optimal_with_uncertainty_penalty.realised_cost` | 104.34 |
| `optimal_with_uncertainty_penalty.promised_cost` | 82.742 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 26.1 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 13.451 |
| `oracle_true_costs.realised_cost` | 91.967 |
| `oracle_true_costs.promised_cost` | 96.002 |
| `oracle_true_costs.optimism_gap_pct` | -4.2029 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
