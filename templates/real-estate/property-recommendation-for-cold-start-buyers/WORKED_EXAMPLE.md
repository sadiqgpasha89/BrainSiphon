# Property Recommendation for Cold-Start Buyers: worked example

> Run on synthetic data with `recommender` engine, seed 53849, knobs {"n_sessions": 52240, "bot_share": 0.137}, in 6.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.

**Constraints that shape the design.** Usable recommendations after three actions or a short questionnaire; No inference of sensitive attributes from behaviour; Every recommendation shows a plain reason

**Label in this use case.** For "Property Recommendation for Cold-Start Buyers": Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Historical logs are dominated by popular homes so offline scores favour popularity.

## 2. Choose the signals

Your strongest signal is **Questionnaire answers** (budget range, bedrooms and preferred area one-hot encoded). Its rule: Self-report is imprecise, so treat it as a prior and not a rule. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.086 at 20 with 1.7% catalogue coverage. Co-visit reaches 0.550, ordered transitions 0.581 and the theme-aware model 0.590 with 99.9% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.086 |
| Hit rate at 20, co-visit | 0.550 |
| Hit rate at 20, ordered transitions | 0.581 |
| Hit rate at 20, theme-aware | 0.590 |
| Catalogue coverage, popularity versus theme-aware | 1.7% vs 99.9% |

## 5. An edge case from the blueprint

**Misleading early clicks.** Early clicks driven by curiosity mislead the profile. Planned response: Decay the weight of early actions and weight saves and enquiries above views. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 31637 |
| `test_sessions` | 8980 |
| `popularity.hit_rate@20` | 0.085746 |
| `popularity.mrr@20` | 0.026214 |
| `popularity.coverage` | 0.017333 |
| `popularity.sessions` | 8980 |
| `bag_covisit.hit_rate@20` | 0.55022 |
| `bag_covisit.mrr@20` | 0.21511 |
| `bag_covisit.coverage` | 0.988 |
| `bag_covisit.sessions` | 8980 |
| `ordered_transition.hit_rate@20` | 0.5814 |
| `ordered_transition.mrr@20` | 0.30654 |
| `ordered_transition.coverage` | 0.98133 |
| `ordered_transition.sessions` | 8980 |
| `theme_aware.hit_rate@20` | 0.58976 |
| `theme_aware.mrr@20` | 0.31929 |
| `theme_aware.coverage` | 0.99933 |
| `theme_aware.sessions` | 8980 |

</details>
