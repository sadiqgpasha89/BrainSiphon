# Court Interpreter Assignment Optimisation: worked example

> Run on synthetic data with `optimize` engine, seed 57341, knobs {"n_instances": 168, "noise": 0.39}, in 1.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well.

**Constraints that shape the design.** Qualification rules as hard constraints; Conflicts of interest checked; Coordinator approves assignments

**Label in this use case.** For "Court Interpreter Assignment Optimisation": Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ignoring conflicts.

## 2. Choose the signals

Your strongest signal is **Language and dialect needs** (languages and dialects required). Its rule: From the case file. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 58.6% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 42.2% worse than the oracle plan; optimal assignment on predictions is 27.6% worse; adding an uncertainty penalty gives 21.8%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 42.2% |
| Regret versus oracle, optimal on predictions | 27.6% |
| Regret versus oracle, optimal with an uncertainty penalty | 21.8% |
| Promised versus realised cost gap, optimal on predictions | 58.6% |

## 5. An edge case from the blueprint

**Rare language.** very few interpreters exist. Planned response: Remote pool and early booking. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 168 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 130.34 |
| `greedy_on_predictions.promised_cost` | 92.212 |
| `greedy_on_predictions.optimism_gap_pct` | 41.35 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 42.175 |
| `optimal_on_predictions.realised_cost` | 117.01 |
| `optimal_on_predictions.promised_cost` | 73.769 |
| `optimal_on_predictions.optimism_gap_pct` | 58.61 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 27.629 |
| `optimal_with_uncertainty_penalty.realised_cost` | 111.65 |
| `optimal_with_uncertainty_penalty.promised_cost` | 76.313 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 46.299 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 21.782 |
| `oracle_true_costs.realised_cost` | 91.677 |
| `oracle_true_costs.promised_cost` | 98.08 |
| `oracle_true_costs.optimism_gap_pct` | -6.5285 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
