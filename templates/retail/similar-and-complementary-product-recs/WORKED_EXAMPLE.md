# Similar & Complementary Product Recommendations: worked example

> Run on synthetic data with `recommender` engine, seed 8662, knobs {"n_sessions": 53530, "bot_share": 0.073}, in 6.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin.

**Constraints that shape the design.** Compatibility correctness (phone case fits phone); 40 ms; Brand/legal exclusions

**Label in this use case.** For "Similar & Complementary Product Recommendations": Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Co-view mistaken for complement.

## 2. Choose the signals

Your strongest signal is **Co-purchase lift** (PMI of co-purchase versus independence). Its rule: Use matured orders only. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.094 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.557, ordered transitions 0.590 and the theme-aware model 0.591 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.094 |
| Hit rate at 20, co-visit | 0.557 |
| Hit rate at 20, ordered transitions | 0.590 |
| Hit rate at 20, theme-aware | 0.591 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 99.9% |

## 5. An edge case from the blueprint

**Accessory for discontinued model.** recommends dead-end items. Planned response: Lifecycle flags and inventory-aware filtering. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 34649 |
| `test_sessions` | 9919 |
| `popularity.hit_rate@20` | 0.093961 |
| `popularity.mrr@20` | 0.028587 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 9919 |
| `bag_covisit.hit_rate@20` | 0.55671 |
| `bag_covisit.mrr@20` | 0.22305 |
| `bag_covisit.coverage` | 0.984 |
| `bag_covisit.sessions` | 9919 |
| `ordered_transition.hit_rate@20` | 0.58978 |
| `ordered_transition.mrr@20` | 0.3149 |
| `ordered_transition.coverage` | 0.98 |
| `ordered_transition.sessions` | 9919 |
| `theme_aware.hit_rate@20` | 0.59099 |
| `theme_aware.mrr@20` | 0.32394 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 9919 |

</details>
