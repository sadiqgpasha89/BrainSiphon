# Category & Browse Page Ranking: worked example

> Run on synthetic data with `recommender` engine, seed 12217, knobs {"n_sessions": 50350, "bot_share": 0.089}, in 6.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure.

**Constraints that shape the design.** Merchandising pins and bans; 40 ms; Fair exposure to new sellers

**Label in this use case.** For "Category & Browse Page Ranking": Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Position bias unaddressed.

## 2. Choose the signals

Your strongest signal is **Debiased CTR** (position-adjusted click-through rate). Its rule: Propensity from randomisation. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.076 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.546, ordered transitions 0.574 and the theme-aware model 0.583 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.076 |
| Hit rate at 20, co-visit | 0.546 |
| Hit rate at 20, ordered transitions | 0.574 |
| Hit rate at 20, theme-aware | 0.583 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 100.0% |

## 5. An edge case from the blueprint

**Merchandiser pin overrides model on bad item.** poor experience. Planned response: Pin expiry and guardrail alerts. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 32015 |
| `test_sessions` | 9234 |
| `popularity.hit_rate@20` | 0.075699 |
| `popularity.mrr@20` | 0.023292 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 9234 |
| `bag_covisit.hit_rate@20` | 0.54559 |
| `bag_covisit.mrr@20` | 0.21588 |
| `bag_covisit.coverage` | 0.99 |
| `bag_covisit.sessions` | 9234 |
| `ordered_transition.hit_rate@20` | 0.5744 |
| `ordered_transition.mrr@20` | 0.30674 |
| `ordered_transition.coverage` | 0.98333 |
| `ordered_transition.sessions` | 9234 |
| `theme_aware.hit_rate@20` | 0.58285 |
| `theme_aware.mrr@20` | 0.31778 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 9234 |

</details>
