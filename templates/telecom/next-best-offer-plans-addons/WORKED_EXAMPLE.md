# Next-Best-Offer for Plans & Add-ons: worked example

> Run on synthetic data with `recommender` engine, seed 48743, knobs {"n_sessions": 46240, "bot_share": 0.146}, in 19.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied.

**Constraints that shape the design.** Response under 80 ms; Offers respect eligibility and consent; Fair-treatment rules prevent steering vulnerable customers into unsuitable products

**Label in this use case.** For "Next-Best-Offer for Plans & Add-ons": Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising take-up only.

## 2. Choose the signals

Your strongest signal is **Usage versus plan fit** (share of allowance used and overage events). Its rule: Per cycle. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.109 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.565, ordered transitions 0.599 and the theme-aware model 0.598 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.109 |
| Hit rate at 20, co-visit | 0.565 |
| Hit rate at 20, ordered transitions | 0.599 |
| Hit rate at 20, theme-aware | 0.598 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 99.9% |

## 5. An edge case from the blueprint

**New offer.** the new offer has no response history. Planned response: Exploration traffic and content features. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 27776 |
| `test_sessions` | 7948 |
| `popularity.hit_rate@20` | 0.10934 |
| `popularity.mrr@20` | 0.024022 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 7948 |
| `bag_covisit.hit_rate@20` | 0.56467 |
| `bag_covisit.mrr@20` | 0.23431 |
| `bag_covisit.coverage` | 0.97333 |
| `bag_covisit.sessions` | 7948 |
| `ordered_transition.hit_rate@20` | 0.59877 |
| `ordered_transition.mrr@20` | 0.31689 |
| `ordered_transition.coverage` | 0.96733 |
| `ordered_transition.sessions` | 7948 |
| `theme_aware.hit_rate@20` | 0.59801 |
| `theme_aware.mrr@20` | 0.32631 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 7948 |

</details>
