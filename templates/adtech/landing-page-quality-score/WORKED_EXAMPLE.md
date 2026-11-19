# Ad Quality Score & Landing-Page Experience: worked example

> Run on synthetic data with `nlp` engine, seed 67926, knobs {"n_docs": 4560}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages.

**Constraints that shape the design.** Page scores cached and refreshed; Crawler politeness; Advertiser appeals

**Label in this use case.** For "Ad Quality Score & Landing-Page Experience": Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect only reported pages.

## 2. Choose the signals

Your strongest signal is **Page load time and layout shift** (Core Web Vitals). Its rule: Lab vs field. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.883 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.449.

## 4. Baseline against the stronger design

The honest evaluation is 0.433 macro-F1 lower than the optimistic one. A frozen model scores 0.807 on the next month and 0.449 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.883 |
| Macro-F1, honest time split | 0.449 |
| Macro-F1, frozen model next month | 0.807 |
| Calibration error, honest split | 0.038 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Page changes content after approval.** bait-and-switch. Planned response: Change detection and periodic re-crawl with cloaking checks. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4560 |
| `duplicate_share` | 0.24868 |
| `random_split_with_leak.macro_f1` | 0.88259 |
| `random_split_with_leak.ece` | 0.13429 |
| `time_split_clean.macro_f1` | 0.44917 |
| `time_split_clean.ece` | 0.038454 |
| `frozen_model_next_month.macro_f1` | 0.80714 |
| `frozen_model_next_month.ece` | 0.13518 |
| `frozen_model_months_6_7.macro_f1` | 0.44917 |
| `frozen_model_months_6_7.ece` | 0.038454 |

</details>
