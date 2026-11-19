# Session-Based Next-Item Recommendation: worked example

> Run on synthetic data with Hand-written starter, in 18.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.

**Constraints that shape the design.** Works for anonymous users; State updated per click; 50 ms

**Label in this use case.** For "Session-Based Next-Item Recommendation": Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random session splits leak popularity.

## 2. Choose the signals

Your strongest signal is **Last-k item embeddings** (transformer encoding of last 20 interactions). Its rule: Cap sequence length so latency stays inside the budget. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| train_sessions | 37911 |
| test_sessions | 10808 |
| popularity.hit_rate@20 | 0.07587 |
| popularity.mrr@20 | 0.02475 |
| popularity.coverage | 0.01867 |
| popularity.sessions | 10808 |

## 5. An edge case from the blueprint

**Bot traffic produces random sequences.** random bot sequences pollute transition statistics and degrade recommendations. Planned response: Bot filter and per-session anomaly flags. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `train_sessions` | 37911 |
| `test_sessions` | 10808 |
| `popularity.hit_rate@20` | 0.07587 |
| `popularity.mrr@20` | 0.024748 |
| `popularity.coverage` | 0.018667 |
| `popularity.sessions` | 10808 |
| `bag_covisit.hit_rate@20` | 0.55662 |
| `bag_covisit.mrr@20` | 0.22368 |
| `bag_covisit.coverage` | 0.986 |
| `bag_covisit.sessions` | 10808 |
| `ordered_transition.hit_rate@20` | 0.58781 |
| `ordered_transition.mrr@20` | 0.31547 |
| `ordered_transition.coverage` | 0.98067 |
| `ordered_transition.sessions` | 10808 |
| `theme_aware.hit_rate@20` | 0.59678 |
| `theme_aware.mrr@20` | 0.32681 |
| `theme_aware.coverage` | 1 |
| `theme_aware.sessions` | 10808 |

</details>
