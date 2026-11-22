# Healthcare Workforce Skill-Mix Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 55920, knobs {"n_instances": 121, "noise": 0.365}, in 2.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint.

**Constraints that shape the design.** Hard constraints cover licensure, competency, supervision ratios, rest and policy mix rules; Soft objectives cover experience balance, development and preference; The output includes a proof of coverage and every violated soft constraint

**Label in this use case.** For "Healthcare Workforce Skill-Mix Optimization": Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring against forecast acuity only.

## 2. Choose the signals

Your strongest signal is **Skill coverage per shift** (required competency count present vs required). Its rule: Competencies valid on the shift date. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 50.0% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 39.8% worse than the oracle plan; optimal assignment on predictions is 24.4% worse; adding an uncertainty penalty gives 19.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 39.8% |
| Regret versus oracle, optimal on predictions | 24.4% |
| Regret versus oracle, optimal with an uncertainty penalty | 19.6% |
| Promised versus realised cost gap, optimal on predictions | 50.0% |

## 5. An edge case from the blueprint

**Competency record missing.** a qualified person looks ineligible. Planned response: Exception queue to credentialing rather than silent exclusion. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 121 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 128.72 |
| `greedy_on_predictions.promised_cost` | 95.603 |
| `greedy_on_predictions.optimism_gap_pct` | 34.644 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 39.773 |
| `optimal_on_predictions.realised_cost` | 114.53 |
| `optimal_on_predictions.promised_cost` | 76.347 |
| `optimal_on_predictions.optimism_gap_pct` | 50.014 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 24.362 |
| `optimal_with_uncertainty_penalty.realised_cost` | 110.16 |
| `optimal_with_uncertainty_penalty.promised_cost` | 78.681 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 40.013 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 19.621 |
| `oracle_true_costs.realised_cost` | 92.094 |
| `oracle_true_costs.promised_cost` | 98.435 |
| `oracle_true_costs.optimism_gap_pct` | -6.4412 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
