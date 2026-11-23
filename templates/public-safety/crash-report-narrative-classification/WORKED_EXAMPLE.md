# Crash Report Narrative Classification: worked example

> Run on synthetic data with `nlp` engine, seed 4920, knobs {"n_docs": 6060}, in 7.1 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields.

**Constraints that shape the design.** Multi-label factors with confidence; Names and plates removed before analysis; Sample audited by safety analysts

**Label in this use case.** For "Crash Report Narrative Classification": Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Checkbox-only labels.

## 2. Choose the signals

Your strongest signal is **Narrative text** (description of the crash). Its rule: From the report. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.3% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.914 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.464.

## 4. Baseline against the stronger design

The honest evaluation is 0.450 macro-F1 lower than the optimistic one. A frozen model scores 0.824 on the next month and 0.464 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.914 |
| Macro-F1, honest time split | 0.464 |
| Macro-F1, frozen model next month | 0.824 |
| Calibration error, honest split | 0.065 |
| Duplicate share | 24.3% |

## 5. An edge case from the blueprint

**Vague narrative.** the text lacks causes. Planned response: Abstain and flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6060 |
| `duplicate_share` | 0.24257 |
| `random_split_with_leak.macro_f1` | 0.91367 |
| `random_split_with_leak.ece` | 0.11842 |
| `time_split_clean.macro_f1` | 0.46416 |
| `time_split_clean.ece` | 0.064869 |
| `frozen_model_next_month.macro_f1` | 0.82369 |
| `frozen_model_next_month.ece` | 0.10493 |
| `frozen_model_months_6_7.macro_f1` | 0.46416 |
| `frozen_model_months_6_7.ece` | 0.064869 |

</details>
