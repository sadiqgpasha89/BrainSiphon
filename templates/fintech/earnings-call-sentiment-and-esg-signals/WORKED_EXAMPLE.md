# Earnings-Call Sentiment & ESG Signal Extraction: worked example

> Run on synthetic data with `nlp` engine, seed 36603, knobs {"n_docs": 6740}, in 3.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models.

**Constraints that shape the design.** Timestamp accuracy to the second; Reproducible model versions; Licence compliance for transcripts

**Label in this use case.** For "Earnings-Call Sentiment & ESG Signal Extraction": Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Date-level joins instead of timestamp.

## 2. Choose the signals

Your strongest signal is **Guidance language change** (diff of forward-looking statements vs prior call). Its rule: Align quarters correctly. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.924 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.473.

## 4. Baseline against the stronger design

The honest evaluation is 0.451 macro-F1 lower than the optimistic one. A frozen model scores 0.821 on the next month and 0.473 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.924 |
| Macro-F1, honest time split | 0.473 |
| Macro-F1, frozen model next month | 0.821 |
| Calibration error, honest split | 0.058 |
| Duplicate share | 25.4% |

## 5. An edge case from the blueprint

**Transcript corrected hours later.** signal changes retroactively. Planned response: Versioned transcripts and as-of timestamps. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6740 |
| `duplicate_share` | 0.2543 |
| `random_split_with_leak.macro_f1` | 0.92421 |
| `random_split_with_leak.ece` | 0.14058 |
| `time_split_clean.macro_f1` | 0.47308 |
| `time_split_clean.ece` | 0.05806 |
| `frozen_model_next_month.macro_f1` | 0.82073 |
| `frozen_model_next_month.ece` | 0.10161 |
| `frozen_model_months_6_7.macro_f1` | 0.47308 |
| `frozen_model_months_6_7.ece` | 0.05806 |

</details>
