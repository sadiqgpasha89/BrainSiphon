# Dynamic Product Ads & Feed Recommendations: worked example

> Run on synthetic data with `recommender` engine, seed 66308, knobs {"n_sessions": 44350, "bot_share": 0.103}, in 11.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions.

**Constraints that shape the design.** Catalogue freshness and stock; Privacy; 30 ms

**Label in this use case.** For "Dynamic Product Ads & Feed Recommendations": Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on retargeted users biased toward high intent.

## 2. Choose the signals

Your strongest signal is **Recent item views** (last viewed items). Its rule: Window. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.077 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.544, ordered transitions 0.579 and the theme-aware model 0.589 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.077 |
| Hit rate at 20, co-visit | 0.544 |
| Hit rate at 20, ordered transitions | 0.579 |
| Hit rate at 20, theme-aware | 0.589 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**Catalogue feed delays.** wrong prices shown. Planned response: Feed freshness SLAs and fallbacks. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 27958 |
| `test_sessions` | 7943 |
| `popularity.hit_rate@20` | 0.077427 |
| `popularity.mrr@20` | 0.023456 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 7943 |
| `bag_covisit.hit_rate@20` | 0.54425 |
| `bag_covisit.mrr@20` | 0.21563 |
| `bag_covisit.coverage` | 0.984 |
| `bag_covisit.sessions` | 7943 |
| `ordered_transition.hit_rate@20` | 0.57938 |
| `ordered_transition.mrr@20` | 0.30596 |
| `ordered_transition.coverage` | 0.97933 |
| `ordered_transition.sessions` | 7943 |
| `theme_aware.hit_rate@20` | 0.58895 |
| `theme_aware.mrr@20` | 0.31763 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 7943 |

</details>
