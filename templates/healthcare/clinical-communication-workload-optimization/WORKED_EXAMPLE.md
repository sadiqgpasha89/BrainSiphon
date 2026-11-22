# Clinical Communication Workload Optimization: worked example

> Run on synthetic data with `optimize` engine, seed 47899, knobs {"n_instances": 150, "noise": 0.439}, in 2.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient.

**Constraints that shape the design.** Clinically significant alerts are never suppressed without approved rules and a safety validation; Recommendations are proposals that a governance group approves before any notification rule changes; Urgent and safety-critical categories are excluded from reduction

**Label in this use case.** For "Clinical Communication Workload Optimization": Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising volume while ignoring urgent categories.

## 2. Choose the signals

Your strongest signal is **Duplicate cluster size** (messages in a cluster of near-identical content to the same group). Its rule: Message text and metadata. In the starter, the closest executable idea is **predicted cost**: model estimate of the cost of each task-resource pairing. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

An optimiser exploits prediction errors: the plan built on predictions promises a cost 74.5% below what it realises, because it picks the pairings whose costs were under-predicted.

## 4. Baseline against the stronger design

Greedy assignment is 47.3% worse than the oracle plan; optimal assignment on predictions is 34.2% worse; adding an uncertainty penalty gives 26.6%.

| Result | Value |
|---|---|
| Regret versus oracle, greedy | 47.3% |
| Regret versus oracle, optimal on predictions | 34.2% |
| Regret versus oracle, optimal with an uncertainty penalty | 26.6% |
| Promised versus realised cost gap, optimal on predictions | 74.5% |

## 5. An edge case from the blueprint

**Duplicate that is a legitimate repeat.** the second message is a reminder of an urgent item. Planned response: Urgency exclusion and a repeat rule. Write the test that replays this case through your pipeline before you tune anything.

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
| `instances` | 150 |
| `size` | 30 |
| `greedy_on_predictions.realised_cost` | 135.53 |
| `greedy_on_predictions.promised_cost` | 90.138 |
| `greedy_on_predictions.optimism_gap_pct` | 50.355 |
| `greedy_on_predictions.regret_vs_oracle_pct` | 47.259 |
| `optimal_on_predictions.realised_cost` | 123.55 |
| `optimal_on_predictions.promised_cost` | 70.819 |
| `optimal_on_predictions.optimism_gap_pct` | 74.455 |
| `optimal_on_predictions.regret_vs_oracle_pct` | 34.243 |
| `optimal_with_uncertainty_penalty.realised_cost` | 116.5 |
| `optimal_with_uncertainty_penalty.promised_cost` | 73.787 |
| `optimal_with_uncertainty_penalty.optimism_gap_pct` | 57.889 |
| `optimal_with_uncertainty_penalty.regret_vs_oracle_pct` | 26.586 |
| `oracle_true_costs.realised_cost` | 92.033 |
| `oracle_true_costs.promised_cost` | 101.58 |
| `oracle_true_costs.optimism_gap_pct` | -9.4022 |
| `oracle_true_costs.regret_vs_oracle_pct` | 0 |

</details>
