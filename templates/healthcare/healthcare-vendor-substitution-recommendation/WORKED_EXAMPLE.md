# Healthcare Vendor Substitution Recommendation: worked example

> Run on synthetic data with `recommender` engine, seed 43306, knobs {"n_sessions": 54240, "bot_share": 0.051}, in 45.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent.

**Constraints that shape the design.** Clinical equivalence is a hard gate from the approved register and never a learned similarity score; Substitution needs clinical, biomedical and procurement approval before use; Rankings show evidence and the approval status of each option

**Label in this use case.** For "Healthcare Vendor Substitution Recommendation": Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using embedding similarity for equivalence.

## 2. Choose the signals

Your strongest signal is **Approved-equivalence status** (status in the clinical equivalence register). Its rule: Register version. In the starter, the closest executable idea is **current item**: the item the user is looking at now. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.

## 4. Baseline against the stronger design

Popularity alone gets a hit rate of 0.118 at 20 with 1.8% catalogue coverage. Co-visit reaches 0.560, ordered transitions 0.592 and the theme-aware model 0.597 with 100.0% coverage.

| Result | Value |
|---|---|
| Hit rate at 20, popularity | 0.118 |
| Hit rate at 20, co-visit | 0.560 |
| Hit rate at 20, ordered transitions | 0.592 |
| Hit rate at 20, theme-aware | 0.597 |
| Catalogue coverage, popularity versus theme-aware | 1.8% vs 100.0% |

## 5. An edge case from the blueprint

**No approved alternative.** the list is empty. Planned response: Escalate to value analysis with a request for evaluation. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_sessions` | 36119 |
| `test_sessions` | 10217 |
| `popularity.hit_rate@20` | 0.11784 |
| `popularity.mrr@20` | 0.023383 |
| `popularity.coverage` | 0.018 |
| `popularity.sessions` | 10217 |
| `bag_covisit.hit_rate@20` | 0.55985 |
| `bag_covisit.mrr@20` | 0.24121 |
| `bag_covisit.coverage` | 0.98467 |
| `bag_covisit.sessions` | 10217 |
| `ordered_transition.hit_rate@20` | 0.59176 |
| `ordered_transition.mrr@20` | 0.31888 |
| `ordered_transition.coverage` | 0.97267 |
| `ordered_transition.sessions` | 10217 |
| `theme_aware.hit_rate@20` | 0.59655 |
| `theme_aware.mrr@20` | 0.3287 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 10217 |

</details>
