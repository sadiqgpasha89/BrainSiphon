# Contact-Centre Call Summarisation & Wrap-up: worked example

> Run on synthetic data with `nlp` engine, seed 43198, knobs {"n_docs": 6130}, in 7.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent.

**Constraints that shape the design.** Summary generated from the transcript and customer record only; Agent reviews and edits before saving; No storage of payment card details

**Label in this use case.** For "Contact-Centre Call Summarisation & Wrap-up": Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring on fluency.

## 2. Choose the signals

Your strongest signal is **Transcript coverage** (share of audio transcribed with confidence). Its rule: Low confidence needs review. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.915 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.486.

## 4. Baseline against the stronger design

The honest evaluation is 0.429 macro-F1 lower than the optimistic one. A frozen model scores 0.851 on the next month and 0.486 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.915 |
| Macro-F1, honest time split | 0.486 |
| Macro-F1, frozen model next month | 0.851 |
| Calibration error, honest split | 0.049 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Accent and noise.** transcript errors. Planned response: Show confidence and require review below a threshold. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6130 |
| `duplicate_share` | 0.24878 |
| `random_split_with_leak.macro_f1` | 0.91527 |
| `random_split_with_leak.ece` | 0.12906 |
| `time_split_clean.macro_f1` | 0.48631 |
| `time_split_clean.ece` | 0.048589 |
| `frozen_model_next_month.macro_f1` | 0.85071 |
| `frozen_model_next_month.ece` | 0.12472 |
| `frozen_model_months_6_7.macro_f1` | 0.48631 |
| `frozen_model_months_6_7.ece` | 0.048589 |

</details>
