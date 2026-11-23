# Legal Aid Eligibility Screening: worked example

> Run on synthetic data with `nlp` engine, seed 21581, knobs {"n_docs": 5590}, in 7.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer.

**Constraints that shape the design.** Rules from the legal text with the rule shown; The assistant never decides; Result says may qualify

**Label in this use case.** For "Legal Aid Eligibility Screening": Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned eligibility.

## 2. Choose the signals

Your strongest signal is **Income and asset rule match** (tests against thresholds). Its rule: From rules. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.852 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.480.

## 4. Baseline against the stronger design

The honest evaluation is 0.372 macro-F1 lower than the optimistic one. A frozen model scores 0.775 on the next month and 0.480 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.852 |
| Macro-F1, honest time split | 0.480 |
| Macro-F1, frozen model next month | 0.775 |
| Calibration error, honest split | 0.063 |
| Duplicate share | 24.2% |

## 5. An edge case from the blueprint

**Rule change.** thresholds change. Planned response: Versioned rules and tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5590 |
| `duplicate_share` | 0.24204 |
| `random_split_with_leak.macro_f1` | 0.85208 |
| `random_split_with_leak.ece` | 0.1068 |
| `time_split_clean.macro_f1` | 0.48028 |
| `time_split_clean.ece` | 0.062784 |
| `frozen_model_next_month.macro_f1` | 0.77457 |
| `frozen_model_next_month.ece` | 0.11654 |
| `frozen_model_months_6_7.macro_f1` | 0.48028 |
| `frozen_model_months_6_7.ece` | 0.062784 |

</details>
