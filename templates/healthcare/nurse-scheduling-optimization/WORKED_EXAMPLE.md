# Nurse Scheduling Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 90321, knobs {"n_instances": 126, "noise": 0.393}, in 0.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules.

**Constraints that shape the design.** Labour regulations; Skill mix and licensure; Fairness in preferences

**Label in this use case.** For "Nurse Scheduling Optimisation": Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on forecast demand.

## 2. Choose the signals

Your strongest signal is **Acuity-weighted demand forecast** (workload units per shift). Its rule: Forecast quality. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 58.1% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 45.1% worse than the oracle plan; optimal assignment on predictions is 27.2% worse; adding an uncertainty penalty gives 22.5%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 45.1% |
| Regret versus oracle, optimal on predictions | 27.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 22.5% |
| Promised versus realised cost gap, optimal on predictions | 58.1% |

## 5. An edge case from the blueprint

**Sudden call-outs.** gaps in coverage. Planned response: Rolling re-optimisation with float pool. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 126 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 132.31 |
| `greedy_on_predictions.promised_cost` | 93.407 |
| `greedy_on_predictions.optimism_gap_pct` | 41.65 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 45.139 |
| `optimal_on_predictions.realised_cost` | 115.93 |
| `optimal_on_predictions.promised_cost` | 73.329 |
| `optimal_on_predictions.optimism_gap_pct` | 58.091 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 27.165 |
| `optimal_with_uncertainty_penalty.realised_cost` | 111.66 |
| `optimal_with_uncertainty_penalty.promised_cost` | 75.647 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 47.603 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 22.482 |
| `oracle_true_costs.realised_cost` | 91.162 |
| `oracle_true_costs.promised_cost` | 98.012 |
| `oracle_true_costs.optimism_gap_pct` | -6.9888 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
