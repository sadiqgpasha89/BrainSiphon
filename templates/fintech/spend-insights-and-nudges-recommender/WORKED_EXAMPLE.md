# Spend Insights & Financial Nudges Recommender: worked example

> Run on synthetic data with `recommender` engine, seed 82582, knobs {"n_sessions": 51760, "bot_share": 0.117}, in 7.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue.

**Constraints that shape the design.** Regulatory suitability for financial prompts; Frequency caps; No dark patterns

**Label in this use case.** For "Spend Insights & Financial Nudges Recommender": Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on opens rather than helpful actions.

## 2. Choose the signals

Your strongest signal is **Savings-gap estimate** (gap between current savings rate and goal trajectory). Its rule: Uses balances as-of nudge time. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.098 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.557, ordered transitions 0.587 and the theme-aware model 0.594 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.098 |
| Hit rate at 20, co-visit | 0.557 |
| Hit rate at 20, ordered transitions | 0.587 |
| Hit rate at 20, theme-aware | 0.594 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**Month-end paycheck day.** all users get saving nudges simultaneously. Planned response: Staggered sends and capacity-aware scheduler. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Offline hit rate is a screen, not a result: the decision is made by an online experiment with guardrails. Keep the time split and the bot filter.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `train_sessions` | 31835 |
| `test_sessions` | 9242 |
| `popularity.hit_rate@20` | 0.098355 |
| `popularity.mrr@20` | 0.020403 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 9242 |
| `bag_covisit.hit_rate@20` | 0.55735 |
| `bag_covisit.mrr@20` | 0.22393 |
| `bag_covisit.coverage` | 0.98533 |
| `bag_covisit.sessions` | 9242 |
| `ordered_transition.hit_rate@20` | 0.58732 |
| `ordered_transition.mrr@20` | 0.30679 |
| `ordered_transition.coverage` | 0.97933 |
| `ordered_transition.sessions` | 9242 |
| `theme_aware.hit_rate@20` | 0.5937 |
| `theme_aware.mrr@20` | 0.31617 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 9242 |

</details>
