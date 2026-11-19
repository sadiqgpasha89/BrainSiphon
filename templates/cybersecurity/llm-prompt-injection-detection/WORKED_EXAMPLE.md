# LLM Prompt-Injection & Jailbreak Detection: worked example

> Run on synthetic data with `nlp` engine, seed 20778, knobs {"n_docs": 6870}, in 2.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools.

**Constraints that shape the design.** Added latency under 30 ms; Multilingual and encoded attacks; Low false positives on legitimate prompts

**Label in this use case.** For "LLM Prompt-Injection & Jailbreak Detection": Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Static public jailbreak datasets.

## 2. Choose the signals

Your strongest signal is **Instruction-likeness of untrusted content** (classifier on imperative text in data). Its rule: Segmentation. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.0% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.878 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.492.

## 4. Baseline against the stronger design

The honest evaluation is 0.386 macro-F1 lower than the optimistic one. A frozen model scores 0.845 on the next month and 0.492 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.878 |
| Macro-F1, honest time split | 0.492 |
| Macro-F1, frozen model next month | 0.845 |
| Calibration error, honest split | 0.057 |
| Duplicate share | 25.0% |

## 5. An edge case from the blueprint

**Attack encoded in base64 or another language.** classifier misses. Planned response: Decode and translate pipeline with multilingual training data. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6870 |
| `duplicate_share` | 0.25036 |
| `random_split_with_leak.macro_f1` | 0.87834 |
| `random_split_with_leak.ece` | 0.09473 |
| `time_split_clean.macro_f1` | 0.49194 |
| `time_split_clean.ece` | 0.056559 |
| `frozen_model_next_month.macro_f1` | 0.84546 |
| `frozen_model_next_month.ece` | 0.092711 |
| `frozen_model_months_6_7.macro_f1` | 0.49194 |
| `frozen_model_months_6_7.ece` | 0.056559 |

</details>
