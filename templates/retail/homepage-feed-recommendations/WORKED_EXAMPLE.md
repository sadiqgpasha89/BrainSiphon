# Homepage Feed Recommendations: worked example

> Run on synthetic data with `recommender` engine, seed 65614, knobs {"n_sessions": 36350, "bot_share": 0.148}, in 4.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness.

**Constraints that shape the design.** 60 ms feed assembly; Frequency capping per item; Diversity constraints

**Label in this use case.** For "Homepage Feed Recommendations": Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on logged policy without propensities.

## 2. Choose the signals

Your strongest signal is **User embedding recency** (exponentially decayed mean of recent item embeddings). Its rule: Decay constants tuned on pre-period. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.079 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.532, ordered transitions 0.564 and the theme-aware model 0.566 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.079 |
| Hit rate at 20, co-visit | 0.532 |
| Hit rate at 20, ordered transitions | 0.564 |
| Hit rate at 20, theme-aware | 0.566 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**New user with no history.** feed is generic. Planned response: Contextual bandit onboarding with category quiz priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 21618 |
| `test_sessions` | 6146 |
| `popularity.hit_rate@20` | 0.07875 |
| `popularity.mrr@20` | 0.02414 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 6146 |
| `bag_covisit.hit_rate@20` | 0.53157 |
| `bag_covisit.mrr@20` | 0.21274 |
| `bag_covisit.coverage` | 0.97467 |
| `bag_covisit.sessions` | 6146 |
| `ordered_transition.hit_rate@20` | 0.56378 |
| `ordered_transition.mrr@20` | 0.30225 |
| `ordered_transition.coverage` | 0.98533 |
| `ordered_transition.sessions` | 6146 |
| `theme_aware.hit_rate@20` | 0.56606 |
| `theme_aware.mrr@20` | 0.31047 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 6146 |

</details>
