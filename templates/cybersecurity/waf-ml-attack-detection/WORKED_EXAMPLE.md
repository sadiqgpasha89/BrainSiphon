# ML Web Application Firewall: worked example

> Run on synthetic data with `nlp` engine, seed 83279, knobs {"n_docs": 6290}, in 2.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives.

**Constraints that shape the design.** Under 1 ms inline; False positives block revenue; Per-application tuning

**Label in this use case.** For "ML Web Application Firewall": Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on attack toolkits only.

## 2. Choose the signals

Your strongest signal is **Normalised payload token features** (token n-grams after decoding). Its rule: Decoder coverage. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.863 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.479.

## 4. Baseline against the stronger design

The honest evaluation is 0.384 macro-F1 lower than the optimistic one. A frozen model scores 0.788 on the next month and 0.479 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.863 |
| Macro-F1, honest time split | 0.479 |
| Macro-F1, frozen model next month | 0.788 |
| Calibration error, honest split | 0.065 |
| Duplicate share | 25.4% |

## 5. An edge case from the blueprint

**New app release changes parameter formats.** legitimate traffic scores as anomalous. Planned response: Deployment hooks that trigger model re-baselining. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6290 |
| `duplicate_share` | 0.2539 |
| `random_split_with_leak.macro_f1` | 0.86333 |
| `random_split_with_leak.ece` | 0.10698 |
| `time_split_clean.macro_f1` | 0.47908 |
| `time_split_clean.ece` | 0.065142 |
| `frozen_model_next_month.macro_f1` | 0.7878 |
| `frozen_model_next_month.ece` | 0.08797 |
| `frozen_model_months_6_7.macro_f1` | 0.47908 |
| `frozen_model_months_6_7.ece` | 0.065142 |

</details>
