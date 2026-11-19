# Query Understanding & Spell Correction: worked example

> Run on synthetic data with `nlp` engine, seed 61186, knobs {"n_docs": 5960}, in 2.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval.

**Constraints that shape the design.** Under 5 ms; 20 languages and code-mixed text; Safe against over-correction of brand names

**Label in this use case.** For "Query Understanding & Spell Correction": Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test queries are clean while production is noisy.

## 2. Choose the signals

Your strongest signal is **Catalogue token frequency** (frequency of the token in titles and past successful queries). Its rule: Update daily and exclude spam titles. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.902 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.446.

## 4. Baseline against the stronger design

The honest evaluation is 0.456 macro-F1 lower than the optimistic one. A frozen model scores 0.783 on the next month and 0.446 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.902 |
| Macro-F1, honest time split | 0.446 |
| Macro-F1, frozen model next month | 0.783 |
| Calibration error, honest split | 0.032 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Viral trending term not in vocabulary.** corrected into nonsense. Planned response: Trend detector adds terms within an hour. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5960 |
| `duplicate_share` | 0.25017 |
| `random_split_with_leak.macro_f1` | 0.90187 |
| `random_split_with_leak.ece` | 0.13204 |
| `time_split_clean.macro_f1` | 0.44574 |
| `time_split_clean.ece` | 0.03192 |
| `frozen_model_next_month.macro_f1` | 0.78301 |
| `frozen_model_next_month.ece` | 0.097689 |
| `frozen_model_months_6_7.macro_f1` | 0.44574 |
| `frozen_model_months_6_7.ece` | 0.03192 |

</details>
