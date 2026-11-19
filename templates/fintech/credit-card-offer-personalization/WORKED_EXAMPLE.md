# Credit Card Offer Personalisation: worked example

> Run on synthetic data with `recommender` engine, seed 24153, knobs {"n_sessions": 51060, "bot_share": 0.061}, in 16.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy.

**Constraints that shape the design.** Pre-approval eligibility filters; Fair-lending rules; Offer must be explainable

**Label in this use case.** For "Credit Card Offer Personalisation": Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks ignores approval outcome.

## 2. Choose the signals

Your strongest signal is **Pre-approval probability** (model score for approval of this offer). Its rule: Compute with current bureau pull date. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.081 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.556, ordered transitions 0.580 and the theme-aware model 0.590 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.081 |
| Hit rate at 20, co-visit | 0.556 |
| Hit rate at 20, ordered transitions | 0.580 |
| Hit rate at 20, theme-aware | 0.590 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 99.9% |

## 5. An edge case from the blueprint

**Rate change invalidates offers.** stale offers shown. Planned response: Offer catalogue versioning and TTL. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 33581 |
| `test_sessions` | 9736 |
| `popularity.hit_rate@20` | 0.080526 |
| `popularity.mrr@20` | 0.023659 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 9736 |
| `bag_covisit.hit_rate@20` | 0.55629 |
| `bag_covisit.mrr@20` | 0.21997 |
| `bag_covisit.coverage` | 0.98933 |
| `bag_covisit.sessions` | 9736 |
| `ordered_transition.hit_rate@20` | 0.5796 |
| `ordered_transition.mrr@20` | 0.30904 |
| `ordered_transition.coverage` | 0.982 |
| `ordered_transition.sessions` | 9736 |
| `theme_aware.hit_rate@20` | 0.58956 |
| `theme_aware.mrr@20` | 0.31991 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 9736 |

</details>
