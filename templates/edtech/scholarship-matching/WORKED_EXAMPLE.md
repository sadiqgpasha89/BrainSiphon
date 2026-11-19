# Scholarship & Financial Aid Matching: worked example

> Run on synthetic data with `recommender` engine, seed 88399, knobs {"n_sessions": 31060, "bot_share": 0.134}, in 9.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Match students to scholarships they are eligible for and likely to win, improving access and application quality.

**Constraints that shape the design.** Hard eligibility rules; Fairness; Deadline-aware

**Label in this use case.** For "Scholarship & Financial Aid Matching": Match students to scholarships they are eligible for and likely to win, improving access and application quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on historical winners with bias.

## 2. Choose the signals

Your strongest signal is **Eligibility rule satisfaction** (structured criteria match). Its rule: Parsing. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.086 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.537, ordered transitions 0.566 and the theme-aware model 0.571 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.086 |
| Hit rate at 20, co-visit | 0.537 |
| Hit rate at 20, ordered transitions | 0.566 |
| Hit rate at 20, theme-aware | 0.571 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**Criteria changed after listing.** students apply to ineligible awards. Planned response: Criteria versioning and re-checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 18616 |
| `test_sessions` | 5593 |
| `popularity.hit_rate@20` | 0.085643 |
| `popularity.mrr@20` | 0.027991 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 5593 |
| `bag_covisit.hit_rate@20` | 0.53692 |
| `bag_covisit.mrr@20` | 0.2178 |
| `bag_covisit.coverage` | 0.966 |
| `bag_covisit.sessions` | 5593 |
| `ordered_transition.hit_rate@20` | 0.56624 |
| `ordered_transition.mrr@20` | 0.30858 |
| `ordered_transition.coverage` | 0.98067 |
| `ordered_transition.sessions` | 5593 |
| `theme_aware.hit_rate@20` | 0.57143 |
| `theme_aware.mrr@20` | 0.31816 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 5593 |

</details>
