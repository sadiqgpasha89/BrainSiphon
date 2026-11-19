# Visual Search & Shop-the-Look: worked example

> Run on synthetic data with `recommender` engine, seed 45475, knobs {"n_sessions": 43650, "bot_share": 0.062}, in 12.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene.

**Constraints that shape the design.** 100 ms end-to-end including detection; Index of 200M images; Safe-content filtering

**Label in this use case.** For "Visual Search & Shop-the-Look": Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Query set built from catalogue crops.

## 2. Choose the signals

Your strongest signal is **Garment crop embedding** (embedding of detected item crops). Its rule: Crop quality gates. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.146 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.604, ordered transitions 0.629 and the theme-aware model 0.622 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.146 |
| Hit rate at 20, co-visit | 0.604 |
| Hit rate at 20, ordered transitions | 0.629 |
| Hit rate at 20, theme-aware | 0.622 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.9% |

## 5. An edge case from the blueprint

**Index refresh lags new arrivals.** new products not findable. Planned response: Streaming index updates with delta shards. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 28768 |
| `test_sessions` | 8138 |
| `popularity.hit_rate@20` | 0.1461 |
| `popularity.mrr@20` | 0.040525 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 8138 |
| `bag_covisit.hit_rate@20` | 0.6042 |
| `bag_covisit.mrr@20` | 0.25787 |
| `bag_covisit.coverage` | 0.978 |
| `bag_covisit.sessions` | 8138 |
| `ordered_transition.hit_rate@20` | 0.62878 |
| `ordered_transition.mrr@20` | 0.32838 |
| `ordered_transition.coverage` | 0.97133 |
| `ordered_transition.sessions` | 8138 |
| `theme_aware.hit_rate@20` | 0.6219 |
| `theme_aware.mrr@20` | 0.33184 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 8138 |

</details>
