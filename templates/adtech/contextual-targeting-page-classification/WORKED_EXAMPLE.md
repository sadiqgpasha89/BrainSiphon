# Contextual Targeting & Page Classification: worked example

> Run on synthetic data with `nlp` engine, seed 10685, knobs {"n_docs": 6820}, in 4.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers.

**Constraints that shape the design.** Classification latency under 50 ms with caching; Multilingual; New pages constantly

**Label in this use case.** For "Contextual Targeting & Page Classification": Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on clean article pages only.

## 2. Choose the signals

Your strongest signal is **Page text embedding** (text encoder embedding). Its rule: Cleaning. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.6% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.889 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.431.

## 4. Baseline against the stronger design

The honest evaluation is 0.458 macro-F1 lower than the optimistic one. A frozen model scores 0.702 on the next month and 0.431 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.889 |
| Macro-F1, honest time split | 0.431 |
| Macro-F1, frozen model next month | 0.702 |
| Calibration error, honest split | 0.054 |
| Duplicate share | 24.6% |

## 5. An edge case from the blueprint

**Breaking news page not yet crawled.** ads shown with no context signal. Planned response: Fallback URL classifier and fast-crawl priority queue. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Trust the honest number, schedule retraining from the drift curve, and keep thread-level splits and the leak scan.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `docs` | 6820 |
| `duplicate_share` | 0.24633 |
| `random_split_with_leak.macro_f1` | 0.88906 |
| `random_split_with_leak.ece` | 0.11949 |
| `time_split_clean.macro_f1` | 0.43121 |
| `time_split_clean.ece` | 0.053749 |
| `frozen_model_next_month.macro_f1` | 0.70215 |
| `frozen_model_next_month.ece` | 0.05663 |
| `frozen_model_months_6_7.macro_f1` | 0.43121 |
| `frozen_model_months_6_7.ece` | 0.053749 |

</details>
