# Out-of-Stock Substitution Recommendations: worked example

> Run on synthetic data with `recommender` engine, seed 31043, knobs {"n_sessions": 36940, "bot_share": 0.102}, in 4.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust.

**Constraints that shape the design.** Dietary and allergy constraints; Price tolerance; Real-time stock

**Label in this use case.** For "Out-of-Stock Substitution Recommendations": Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Acceptance logged only for offered items.

## 2. Choose the signals

Your strongest signal is **Historic substitution acceptance** (acceptance rate for the item pair). Its rule: Matured pairs. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.082 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.543, ordered transitions 0.568 and the theme-aware model 0.577 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.082 |
| Hit rate at 20, co-visit | 0.543 |
| Hit rate at 20, ordered transitions | 0.568 |
| Hit rate at 20, theme-aware | 0.577 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**Inventory data inaccurate.** substitute also missing. Planned response: Stock confidence score and fallback list. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 23233 |
| `test_sessions` | 6535 |
| `popularity.hit_rate@20` | 0.082479 |
| `popularity.mrr@20` | 0.025608 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 6535 |
| `bag_covisit.hit_rate@20` | 0.54262 |
| `bag_covisit.mrr@20` | 0.2195 |
| `bag_covisit.coverage` | 0.97467 |
| `bag_covisit.sessions` | 6535 |
| `ordered_transition.hit_rate@20` | 0.56848 |
| `ordered_transition.mrr@20` | 0.30902 |
| `ordered_transition.coverage` | 0.976 |
| `ordered_transition.sessions` | 6535 |
| `theme_aware.hit_rate@20` | 0.57659 |
| `theme_aware.mrr@20` | 0.31529 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 6535 |

</details>
