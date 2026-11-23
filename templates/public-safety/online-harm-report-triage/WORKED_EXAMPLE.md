# Online Harm Report Triage: worked example

> Run on synthetic data with `nlp` engine, seed 26538, knobs {"n_docs": 6640}, in 7.5 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users.

**Constraints that shape the design.** Possible risk to life goes to a person at once; Reviewer wellbeing protections for hard content; No automatic account or content action

**Label in this use case.** For "Online Harm Report Triage": Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic sanctions.

## 2. Choose the signals

Your strongest signal is **Threat and self-harm cues** (words indicating danger). Its rule: From text. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.919 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.482.

## 4. Baseline against the stronger design

The honest evaluation is 0.437 macro-F1 lower than the optimistic one. A frozen model scores 0.818 on the next month and 0.482 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.919 |
| Macro-F1, honest time split | 0.482 |
| Macro-F1, frozen model next month | 0.818 |
| Calibration error, honest split | 0.047 |
| Duplicate share | 24.1% |

## 5. An edge case from the blueprint

**Coded language.** threats are hidden. Planned response: Human sampling and lexicon updates. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6640 |
| `duplicate_share` | 0.24111 |
| `random_split_with_leak.macro_f1` | 0.91903 |
| `random_split_with_leak.ece` | 0.12681 |
| `time_split_clean.macro_f1` | 0.48193 |
| `time_split_clean.ece` | 0.046753 |
| `frozen_model_next_month.macro_f1` | 0.81783 |
| `frozen_model_next_month.ece` | 0.10123 |
| `frozen_model_months_6_7.macro_f1` | 0.48193 |
| `frozen_model_months_6_7.ece` | 0.046753 |

</details>
