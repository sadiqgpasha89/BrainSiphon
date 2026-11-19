# Patient Similarity & Cohort Search: worked example

> Run on synthetic data with `recommender` engine, seed 47030, knobs {"n_sessions": 35880, "bot_share": 0.133}, in 7.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries.

**Constraints that shape the design.** Privacy and access control; Query explanations; Cohort definitions reproducible

**Label in this use case.** For "Patient Similarity & Cohort Search": Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Gold cohorts from one disease.

## 2. Choose the signals

Your strongest signal is **Longitudinal code embedding** (sequence-based patient embedding). Its rule: Time window. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.070 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.537, ordered transitions 0.564 and the theme-aware model 0.569 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.070 |
| Hit rate at 20, co-visit | 0.537 |
| Hit rate at 20, ordered transitions | 0.564 |
| Hit rate at 20, theme-aware | 0.569 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 100.0% |

## 5. An edge case from the blueprint

**Natural-language ambiguity.** wrong cohort definition. Planned response: Show executable definition and require confirmation. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 21867 |
| `test_sessions` | 6243 |
| `popularity.hit_rate@20` | 0.070479 |
| `popularity.mrr@20` | 0.019869 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 6243 |
| `bag_covisit.hit_rate@20` | 0.53676 |
| `bag_covisit.mrr@20` | 0.21496 |
| `bag_covisit.coverage` | 0.97067 |
| `bag_covisit.sessions` | 6243 |
| `ordered_transition.hit_rate@20` | 0.56399 |
| `ordered_transition.mrr@20` | 0.3019 |
| `ordered_transition.coverage` | 0.978 |
| `ordered_transition.sessions` | 6243 |
| `theme_aware.hit_rate@20` | 0.56896 |
| `theme_aware.mrr@20` | 0.31305 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 6243 |

</details>
