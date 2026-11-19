# Home Search Ranking: worked example

> Run on synthetic data with `recommender` engine, seed 46900, knobs {"n_sessions": 32590, "bot_share": 0.115}, in 9.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.

**Constraints that shape the design.** Under 80 ms at the 99th percentile including retrieval and re-rank; Every filter the buyer sets is respected exactly and never traded for relevance; No steering by protected attributes or their proxies in features or exposure

**Label in this use case.** For "Home Search Ranking": Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Position bias in click logs means top results look better than they are.

## 2. Choose the signals

Your strongest signal is **Price fit** (position of the price within the buyer's stated range, scaled from 0 to 1). Its rule: The range changes during a search, so use the current one. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.121 at 20 with 1.9% catalogue coverage. Co-visit reaches 0.575, ordered transitions 0.607 and the theme-aware model 0.597 with 99.7% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.121 |
| Hit rate at 20, co-visit | 0.575 |
| Hit rate at 20, ordered transitions | 0.607 |
| Hit rate at 20, theme-aware | 0.597 |
| Catalogue coverage, popularity versus theme-aware | 1.9% vs 99.7% |

## 5. An edge case from the blueprint

**Cold start buyer.** A new buyer has no history so ranking has little to personalise on. Planned response: Fall back to popularity within the buyer's filters and refine after the first few actions. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 20337 |
| `test_sessions` | 5719 |
| `popularity.hit_rate@20` | 0.12118 |
| `popularity.mrr@20` | 0.032197 |
| `popularity.coverage` | 0.019333 |
| `popularity.sessions` | 5719 |
| `bag_covisit.hit_rate@20` | 0.57528 |
| `bag_covisit.mrr@20` | 0.24045 |
| `bag_covisit.coverage` | 0.95933 |
| `bag_covisit.sessions` | 5719 |
| `ordered_transition.hit_rate@20` | 0.60675 |
| `ordered_transition.mrr@20` | 0.31829 |
| `ordered_transition.coverage` | 0.966 |
| `ordered_transition.sessions` | 5719 |
| `theme_aware.hit_rate@20` | 0.59713 |
| `theme_aware.mrr@20` | 0.32309 |
| `theme_aware.coverage` | 0.99733 |
| `theme_aware.sessions` | 5719 |

</details>
