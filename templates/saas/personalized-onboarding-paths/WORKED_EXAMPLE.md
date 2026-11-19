# Personalised Onboarding Paths: worked example

> Run on synthetic data with `bandit` engine, seed 18267, knobs {"n": 35690, "logging_temperature": 0.849}, in 0.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Tailor onboarding steps and templates to each new user or team to reach first value faster.

**Constraints that shape the design.** Quick decisions per step; Role and goal context; Experimentation

**Label in this use case.** For "Personalised Onboarding Paths": Tailor onboarding steps and templates to each new user or team to reach first value faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding checklist completion.

## 2. Choose the signals

Your strongest signal is **Declared role and goal** (survey answers). Its rule: Consent. In the starter, the closest executable idea is **context features**: what is known about the situation when the decision is made. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives 0.708 for the learned policy, but its true value is 0.654. The pack knows the truth because the world is simulated.

## 4. Baseline against the stronger design

The best constant action is worth 0.444; the learned policy is worth 0.654. Inverse-propensity weighting estimates 0.472 and the doubly robust estimator 0.649.

| Result | Value |
|---|---|
| True value, best constant action | 0.444 |
| True value, learned policy | 0.654 |
| Doubly robust estimate, learned policy | 0.649 |
| Inverse-propensity estimate, learned policy | 0.472 |
| Naive matched-rows estimate, learned policy | 0.708 |

## 5. An edge case from the blueprint

**Cold-start users with no context.** generic choices. Planned response: Short intake survey and contextual priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `logged_rows` | 35690 |
| `logging_reward_rate` | 0.39964 |
| `always_best_average_action.true_value` | 0.44352 |
| `always_best_average_action.naive_matched` | 0.5647 |
| `always_best_average_action.ips` | 0.3693 |
| `always_best_average_action.snips` | 0.4667 |
| `always_best_average_action.doubly_robust` | 0.4339 |
| `always_best_average_action.match_rate` | 0.3069 |
| `learned_greedy.true_value` | 0.65424 |
| `learned_greedy.naive_matched` | 0.7081 |
| `learned_greedy.ips` | 0.4723 |
| `learned_greedy.snips` | 0.6339 |
| `learned_greedy.doubly_robust` | 0.6487 |
| `learned_greedy.match_rate` | 0.2442 |

</details>
