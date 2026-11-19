# Corporate Relationship Manager Lead Prioritisation: worked example

> Run on synthetic data with `recommender` engine, seed 52450, knobs {"n_sessions": 34120, "bot_share": 0.101}, in 10.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need.

**Constraints that shape the design.** The reason for each ranking can be explained in plain terms to the manager; Output sized to a capacity of 30 calls a week per manager; Clients under conflict-of-interest restrictions never appear

**Label in this use case.** For "Corporate Relationship Manager Lead Prioritisation": Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past calls were not random, so outcomes reflect who was called and not who needed a product.

## 2. Choose the signals

Your strongest signal is **Cash and debt events** (upcoming debt maturities and large payments from the client's own accounts). Its rule: Access depends on the client's accounts with the bank. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.077 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.538, ordered transitions 0.562 and the theme-aware model 0.572 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.077 |
| Hit rate at 20, co-visit | 0.538 |
| Hit rate at 20, ordered transitions | 0.562 |
| Hit rate at 20, theme-aware | 0.572 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 99.9% |

## 5. An edge case from the blueprint

**Conflict wall.** A client is on a restricted list and must not be contacted. Planned response: Apply a compliance filter before ranking so restricted clients never appear. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 21369 |
| `test_sessions` | 6211 |
| `popularity.hit_rate@20` | 0.077121 |
| `popularity.mrr@20` | 0.023725 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 6211 |
| `bag_covisit.hit_rate@20` | 0.53759 |
| `bag_covisit.mrr@20` | 0.21786 |
| `bag_covisit.coverage` | 0.972 |
| `bag_covisit.sessions` | 6211 |
| `ordered_transition.hit_rate@20` | 0.56223 |
| `ordered_transition.mrr@20` | 0.30694 |
| `ordered_transition.coverage` | 0.98 |
| `ordered_transition.sessions` | 6211 |
| `theme_aware.hit_rate@20` | 0.57173 |
| `theme_aware.mrr@20` | 0.31617 |
| `theme_aware.coverage` | 0.99867 |
| `theme_aware.sessions` | 6211 |

</details>
