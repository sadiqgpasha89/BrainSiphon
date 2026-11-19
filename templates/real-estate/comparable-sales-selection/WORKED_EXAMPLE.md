# Comparable Sales Selection: worked example

> Run on synthetic data with `recommender` engine, seed 50681, knobs {"n_sessions": 56590, "bot_share": 0.134}, in 17.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible.

**Constraints that shape the design.** Comparable set explainable to an appraiser; Only closed sales before the valuation date; Response under 100 ms

**Label in this use case.** For "Comparable Sales Selection": Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Appraiser comps are biased toward familiar sales.

## 2. Choose the signals

Your strongest signal is **Learned property embedding** (vector from attributes and photos). Its rule: Training data bias. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.072 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.560, ordered transitions 0.587 and the theme-aware model 0.594 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.072 |
| Hit rate at 20, co-visit | 0.560 |
| Hit rate at 20, ordered transitions | 0.587 |
| Hit rate at 20, theme-aware | 0.594 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 100.0% |

## 5. An edge case from the blueprint

**Few comparables.** Rural properties have few comparables within any sensible radius. Planned response: Widen the search criteria in steps and flag the lower confidence to the appraiser. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 34276 |
| `test_sessions` | 9941 |
| `popularity.hit_rate@20` | 0.072126 |
| `popularity.mrr@20` | 0.022913 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 9941 |
| `bag_covisit.hit_rate@20` | 0.5601 |
| `bag_covisit.mrr@20` | 0.22841 |
| `bag_covisit.coverage` | 0.98933 |
| `bag_covisit.sessions` | 9941 |
| `ordered_transition.hit_rate@20` | 0.58726 |
| `ordered_transition.mrr@20` | 0.32017 |
| `ordered_transition.coverage` | 0.986 |
| `ordered_transition.sessions` | 9941 |
| `theme_aware.hit_rate@20` | 0.5938 |
| `theme_aware.mrr@20` | 0.32904 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 9941 |

</details>
