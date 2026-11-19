# Query–Ad Relevance Matching: worked example

> Run on synthetic data with `recommender` engine, seed 13171, knobs {"n_sessions": 30470, "bot_share": 0.055}, in 9.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score semantic relevance between queries and ads to gate eligibility and improve quality scores.

**Constraints that shape the design.** 10 ms scoring with cached ad embeddings; Multi-language; Click-labelled bias

**Label in this use case.** For "Query–Ad Relevance Matching": Score semantic relevance between queries and ads to gate eligibility and improve quality scores. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks biased by position.

## 2. Choose the signals

Your strongest signal is **Dual-encoder similarity** (query and ad embedding cosine). Its rule: Ad embedding refresh. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.130 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.544, ordered transitions 0.578 and the theme-aware model 0.573 with 99.8% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.130 |
| Hit rate at 20, co-visit | 0.544 |
| Hit rate at 20, ordered transitions | 0.578 |
| Hit rate at 20, theme-aware | 0.573 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.8% |

## 5. An edge case from the blueprint

**Brand queries for competitors.** ads shown against policy. Planned response: Competitor-brand rules in gate. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 20197 |
| `test_sessions` | 5628 |
| `popularity.hit_rate@20` | 0.13042 |
| `popularity.mrr@20` | 0.03345 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 5628 |
| `bag_covisit.hit_rate@20` | 0.54371 |
| `bag_covisit.mrr@20` | 0.21792 |
| `bag_covisit.coverage` | 0.95933 |
| `bag_covisit.sessions` | 5628 |
| `ordered_transition.hit_rate@20` | 0.57818 |
| `ordered_transition.mrr@20` | 0.29753 |
| `ordered_transition.coverage` | 0.968 |
| `ordered_transition.sessions` | 5628 |
| `theme_aware.hit_rate@20` | 0.57267 |
| `theme_aware.mrr@20` | 0.30679 |
| `theme_aware.coverage` | 0.998 |
| `theme_aware.sessions` | 5628 |

</details>
