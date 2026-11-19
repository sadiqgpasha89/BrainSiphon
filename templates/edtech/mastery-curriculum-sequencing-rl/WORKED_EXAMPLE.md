# Mastery-Based Curriculum Sequencing: worked example

> Run on synthetic data with `bandit` engine, seed 69775, knobs {"n": 37800, "logging_temperature": 0.961}, in 0.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting.

**Constraints that shape the design.** Offline learning from logs; Safety (no harmful sequences); Interpretability for teachers

**Label in this use case.** For "Mastery-Based Curriculum Sequencing": Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator trained on the same logs as the policy.

## 2. Choose the signals

Your strongest signal is **Prerequisite readiness** (mastery of parent skills). Its rule: DAG. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.802 for the learned policy, but its true value is 0.826. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.420; the learned policy is worth 0.826. Inverse-propensity weighting estimates 0.687 and the doubly robust estimator 0.829.

| Result | Value |
|---|---|
| True value, best constant action | 0.420 |
| True value, learned policy | 0.826 |
| Doubly robust estimate, learned policy | 0.829 |
| Inverse-propensity estimate, learned policy | 0.687 |
| Naive matched-rows estimate, learned policy | 0.802 |

## 5. An edge case from the blueprint

**Distribution shift when the policy changes behaviour.** value estimates wrong. Planned response: Pessimism and gradual rollout with monitoring. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 37800 |
| `logging_reward_rate` | 0.33788 |
| `always_best_average_action.true_value` | 0.41971 |
| `always_best_average_action.naive_matched` | 0.5955 |
| `always_best_average_action.ips` | 0.4008 |
| `always_best_average_action.snips` | 0.4444 |
| `always_best_average_action.doubly_robust` | 0.4236 |
| `always_best_average_action.match_rate` | 0.2681 |
| `learned_greedy.true_value` | 0.82633 |
| `learned_greedy.naive_matched` | 0.8016 |
| `learned_greedy.ips` | 0.6866 |
| `learned_greedy.snips` | 0.8108 |
| `learned_greedy.doubly_robust` | 0.8292 |
| `learned_greedy.match_rate` | 0.1878 |

</details>
