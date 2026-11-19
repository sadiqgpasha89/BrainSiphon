# Enterprise Search Relevance: worked example

> Run on synthetic data with `recommender` engine, seed 13943, knobs {"n_sessions": 49760, "bot_share": 0.148}, in 10.8 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions.

**Constraints that shape the design.** Permission-aware retrieval; Heterogeneous sources; Freshness within minutes

**Label in this use case.** For "Enterprise Search Relevance": Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on click logs with position bias.

## 2. Choose the signals

Your strongest signal is **Hybrid lexical-semantic score** (BM25 plus dense similarity). Its rule: Fusion. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.086 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.539, ordered transitions 0.565 and the theme-aware model 0.571 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.086 |
| Hit rate at 20, co-visit | 0.539 |
| Hit rate at 20, ordered transitions | 0.565 |
| Hit rate at 20, theme-aware | 0.571 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 99.9% |

## 5. An edge case from the blueprint

**Permission change not yet propagated.** user sees documents they should not. Planned response: Fast ACL sync and result-time permission checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 29680 |
| `test_sessions` | 8537 |
| `popularity.hit_rate@20` | 0.085862 |
| `popularity.mrr@20` | 0.025694 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 8537 |
| `bag_covisit.hit_rate@20` | 0.53871 |
| `bag_covisit.mrr@20` | 0.21766 |
| `bag_covisit.coverage` | 0.98533 |
| `bag_covisit.sessions` | 8537 |
| `ordered_transition.hit_rate@20` | 0.56495 |
| `ordered_transition.mrr@20` | 0.30786 |
| `ordered_transition.coverage` | 0.98933 |
| `ordered_transition.sessions` | 8537 |
| `theme_aware.hit_rate@20` | 0.57104 |
| `theme_aware.mrr@20` | 0.31817 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 8537 |

</details>
