# Learner Engagement Prediction & Notifications: worked example

> Run on synthetic data with `bandit` engine, seed 28316, knobs {"n": 21180, "logging_temperature": 0.802}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue.

**Constraints that shape the design.** Frequency caps; Wellbeing considerations for minors; Consent

**Label in this use case.** For "Learner Engagement Prediction & Notifications": Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising opens.

## 2. Choose the signals

Your strongest signal is **Lapse hazard** (probability of missing the next 3 days). Its rule: Survival. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.832 for the learned policy, but its true value is 0.833. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.405; the learned policy is worth 0.833. Inverse-propensity weighting estimates 0.763 and the doubly robust estimator 0.840.

| Result | Value |
|---|---|
| True value, best constant action | 0.405 |
| True value, learned policy | 0.833 |
| Doubly robust estimate, learned policy | 0.840 |
| Inverse-propensity estimate, learned policy | 0.763 |
| Naive matched-rows estimate, learned policy | 0.832 |

## 5. An edge case from the blueprint

**Exam week changes study patterns.** predictions off. Planned response: Calendar and school-term features. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 21180 |
| `logging_reward_rate` | 0.40661 |
| `always_best_average_action.true_value` | 0.40539 |
| `always_best_average_action.naive_matched` | 0.5579 |
| `always_best_average_action.ips` | 0.3931 |
| `always_best_average_action.snips` | 0.4151 |
| `always_best_average_action.doubly_robust` | 0.4047 |
| `always_best_average_action.match_rate` | 0.2742 |
| `learned_greedy.true_value` | 0.83341 |
| `learned_greedy.naive_matched` | 0.8315 |
| `learned_greedy.ips` | 0.7629 |
| `learned_greedy.snips` | 0.8345 |
| `learned_greedy.doubly_robust` | 0.8399 |
| `learned_greedy.match_rate` | 0.2163 |

</details>
