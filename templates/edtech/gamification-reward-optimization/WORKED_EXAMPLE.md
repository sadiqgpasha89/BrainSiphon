# Gamification & Reward Optimisation: worked example

> Run on synthetic data with `bandit` engine, seed 21061, knobs {"n": 30120, "logging_temperature": 1.161}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design.

**Constraints that shape the design.** Ethical design for minors; Intrinsic motivation; Fairness

**Label in this use case.** For "Gamification & Reward Optimisation": Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding time-on-app.

## 2. Choose the signals

Your strongest signal is **Intrinsic engagement proxy** (voluntary extra practice). Its rule: Definition. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.735 for the learned policy, but its true value is 0.722. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.459; the learned policy is worth 0.722. Inverse-propensity weighting estimates 0.664 and the doubly robust estimator 0.710.

| Result | Value |
|---|---|
| True value, best constant action | 0.459 |
| True value, learned policy | 0.722 |
| Doubly robust estimate, learned policy | 0.710 |
| Inverse-propensity estimate, learned policy | 0.664 |
| Naive matched-rows estimate, learned policy | 0.735 |

## 5. An edge case from the blueprint

**Rewards crowd out intrinsic motivation.** engagement drops when rewards stop. Planned response: Fade rewards and measure post-removal behaviour. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 30120 |
| `logging_reward_rate` | 0.40129 |
| `always_best_average_action.true_value` | 0.45917 |
| `always_best_average_action.naive_matched` | 0.5736 |
| `always_best_average_action.ips` | 0.4556 |
| `always_best_average_action.snips` | 0.469 |
| `always_best_average_action.doubly_robust` | 0.4471 |
| `always_best_average_action.match_rate` | 0.2746 |
| `learned_greedy.true_value` | 0.72202 |
| `learned_greedy.naive_matched` | 0.7346 |
| `learned_greedy.ips` | 0.6639 |
| `learned_greedy.snips` | 0.7047 |
| `learned_greedy.doubly_robust` | 0.7096 |
| `learned_greedy.match_rate` | 0.2489 |

</details>
