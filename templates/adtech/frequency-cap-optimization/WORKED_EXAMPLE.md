# Frequency Cap & Exposure Optimisation: worked example

> Run on synthetic data with `bandit` engine, seed 47163, knobs {"n": 30430, "logging_temperature": 1.237}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance.

**Constraints that shape the design.** Cross-device counting; Consent; Real-time counters

**Label in this use case.** For "Frequency Cap & Exposure Optimisation": Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational frequency effects confounded by targeting.

## 2. Choose the signals

Your strongest signal is **Marginal conversion gain** (conversion probability change per exposure). Its rule: Experiments. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.733 for the learned policy, but its true value is 0.692. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.399; the learned policy is worth 0.692. Inverse-propensity weighting estimates 0.691 and the doubly robust estimator 0.702.

| Result | Value |
|---|---|
| True value, best constant action | 0.399 |
| True value, learned policy | 0.692 |
| Doubly robust estimate, learned policy | 0.702 |
| Inverse-propensity estimate, learned policy | 0.691 |
| Naive matched-rows estimate, learned policy | 0.733 |

## 5. An edge case from the blueprint

**Counter inconsistency across regions.** over-exposure to users. Planned response: Regional replication with conservative caps. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Log propensities from day one, evaluate with a doubly robust estimator, and confirm with a small online holdout before changing the policy.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `logged_rows` | 30430 |
| `logging_reward_rate` | 0.3863 |
| `always_best_average_action.true_value` | 0.39913 |
| `always_best_average_action.naive_matched` | 0.5537 |
| `always_best_average_action.ips` | 0.4259 |
| `always_best_average_action.snips` | 0.4297 |
| `always_best_average_action.doubly_robust` | 0.4147 |
| `always_best_average_action.match_rate` | 0.2758 |
| `learned_greedy.true_value` | 0.69205 |
| `learned_greedy.naive_matched` | 0.7334 |
| `learned_greedy.ips` | 0.6906 |
| `learned_greedy.snips` | 0.7032 |
| `learned_greedy.doubly_robust` | 0.702 |
| `learned_greedy.match_rate` | 0.2199 |

</details>
