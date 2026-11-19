# Course & Career Path Recommendation: worked example

> Run on synthetic data with `recommender` engine, seed 68483, knobs {"n_sessions": 40470, "bot_share": 0.136}, in 9.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes.

**Constraints that shape the design.** Diversity and fairness; Prerequisites; Up-to-date skills data

**Label in this use case.** For "Course & Career Path Recommendation": Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on enrolments that reflect past recommendations.

## 2. Choose the signals

Your strongest signal is **Skill-gap vector** (target role skills minus current skills). Its rule: Skills graph. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.077 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.539, ordered transitions 0.574 and the theme-aware model 0.576 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.077 |
| Hit rate at 20, co-visit | 0.539 |
| Hit rate at 20, ordered transitions | 0.574 |
| Hit rate at 20, theme-aware | 0.576 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.9% |

## 5. An edge case from the blueprint

**Skills taxonomy changes.** embeddings misaligned. Planned response: Taxonomy versioning and mapping. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 24507 |
| `test_sessions` | 6996 |
| `popularity.hit_rate@20` | 0.076615 |
| `popularity.mrr@20` | 0.022398 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 6996 |
| `bag_covisit.hit_rate@20` | 0.53902 |
| `bag_covisit.mrr@20` | 0.21617 |
| `bag_covisit.coverage` | 0.97667 |
| `bag_covisit.sessions` | 6996 |
| `ordered_transition.hit_rate@20` | 0.57404 |
| `ordered_transition.mrr@20` | 0.31148 |
| `ordered_transition.coverage` | 0.98 |
| `ordered_transition.sessions` | 6996 |
| `theme_aware.hit_rate@20` | 0.57647 |
| `theme_aware.mrr@20` | 0.32108 |
| `theme_aware.coverage` | 0.99867 |
| `theme_aware.sessions` | 6996 |

</details>
