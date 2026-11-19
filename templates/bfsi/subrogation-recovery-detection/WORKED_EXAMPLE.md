# Subrogation Recovery Detection: worked example

> Run on synthetic data with `nlp` engine, seed 27310, knobs {"n_docs": 4550}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Find paid claims where another party is liable so the insurer recovers money it would otherwise lose.

**Constraints that shape the design.** Statute-of-limitations dates tracked for every candidate and shown to the reviewer; A reviewer sees the evidence behind every flag; Recovery effort weighed against the expected net value

**Label in this use case.** For "Subrogation Recovery Detection": Find paid claims where another party is liable so the insurer recovers money it would otherwise lose. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past flags are biased to obvious cases, so the model repeats the cases staff already found.

## 2. Choose the signals

Your strongest signal is **Fault phrases** (presence of phrases such as rear-ended, third party driver or defective product in the claim notes). Its rule: Phrases need context, since a customer may blame themselves. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.889 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.420.

## 4. Baseline against the stronger design

The honest evaluation is 0.469 macro-F1 lower than the optimistic one. A frozen model scores 0.793 on the next month and 0.420 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.889 |
| Macro-F1, honest time split | 0.420 |
| Macro-F1, frozen model next month | 0.793 |
| Calibration error, honest split | 0.043 |
| Duplicate share | 24.8% |

## 5. An edge case from the blueprint

**Partial liability.** Fault is shared between parties so a yes-or-no liability label misses part of the recovery. Planned response: Model recovery as a percentage of the loss and rank by expected net recovery. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4550 |
| `duplicate_share` | 0.24791 |
| `random_split_with_leak.macro_f1` | 0.88891 |
| `random_split_with_leak.ece` | 0.13753 |
| `time_split_clean.macro_f1` | 0.42021 |
| `time_split_clean.ece` | 0.043217 |
| `frozen_model_next_month.macro_f1` | 0.79313 |
| `frozen_model_next_month.ece` | 0.11301 |
| `frozen_model_months_6_7.macro_f1` | 0.42021 |
| `frozen_model_months_6_7.ece` | 0.043217 |

</details>
