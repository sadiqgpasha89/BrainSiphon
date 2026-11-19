# Personalised Product Search Ranking: worked example

> Run on synthetic data with `recommender` engine, seed 70871, knobs {"n_sessions": 47410, "bot_share": 0.091}, in 6.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers.

**Constraints that shape the design.** p99 under 80 ms including retrieval; 100M-item catalogue; Position-bias-aware training

**Label in this use case.** For "Personalised Product Search Ranking": Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks from the current ranker.

## 2. Choose the signals

Your strongest signal is **Query-item semantic score** (cosine of query and item embeddings from a dual encoder). Its rule: Embeddings must be trained on pre-period logs. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.120 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.556, ordered transitions 0.583 and the theme-aware model 0.593 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.120 |
| Hit rate at 20, co-visit | 0.556 |
| Hit rate at 20, ordered transitions | 0.583 |
| Hit rate at 20, theme-aware | 0.593 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**New seller floods catalogue with keyword-stuffed items.** rankings polluted. Planned response: Quality score features and seller-trust priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 30120 |
| `test_sessions` | 8733 |
| `popularity.hit_rate@20` | 0.11978 |
| `popularity.mrr@20` | 0.023284 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 8733 |
| `bag_covisit.hit_rate@20` | 0.55628 |
| `bag_covisit.mrr@20` | 0.22866 |
| `bag_covisit.coverage` | 0.98533 |
| `bag_covisit.sessions` | 8733 |
| `ordered_transition.hit_rate@20` | 0.58296 |
| `ordered_transition.mrr@20` | 0.31007 |
| `ordered_transition.coverage` | 0.97667 |
| `ordered_transition.sessions` | 8733 |
| `theme_aware.hit_rate@20` | 0.59292 |
| `theme_aware.mrr@20` | 0.31822 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 8733 |

</details>
