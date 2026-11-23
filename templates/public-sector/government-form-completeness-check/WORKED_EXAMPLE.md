# Government Form Completeness Check: worked example

> Run on synthetic data with `nlp` engine, seed 12480, knobs {"n_docs": 6580}, in 7.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them.

**Constraints that shape the design.** The check explains each problem in plain language; No decision on the application; Works on scans and photos

**Label in this use case.** For "Government Form Completeness Check": Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Blocking submissions.

## 2. Choose the signals

Your strongest signal is **Required field presence** (missing or malformed fields). Its rule: From the form schema. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.4% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.880 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.448.

## 4. Baseline against the stronger design

The honest evaluation is 0.431 macro-F1 lower than the optimistic one. A frozen model scores 0.818 on the next month and 0.448 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.880 |
| Macro-F1, honest time split | 0.448 |
| Macro-F1, frozen model next month | 0.818 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 24.4% |

## 5. An edge case from the blueprint

**Unusual document.** a valid proof is not recognised. Planned response: Allow submission with a flag and staff review. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6580 |
| `duplicate_share` | 0.24422 |
| `random_split_with_leak.macro_f1` | 0.87972 |
| `random_split_with_leak.ece` | 0.10971 |
| `time_split_clean.macro_f1` | 0.4485 |
| `time_split_clean.ece` | 0.052959 |
| `frozen_model_next_month.macro_f1` | 0.81823 |
| `frozen_model_next_month.ece` | 0.10264 |
| `frozen_model_months_6_7.macro_f1` | 0.4485 |
| `frozen_model_months_6_7.ece` | 0.052959 |

</details>
