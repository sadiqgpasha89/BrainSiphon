# Benefits Eligibility Screening Assistant: worked example

> Run on synthetic data with `nlp` engine, seed 24453, knobs {"n_docs": 5700}, in 7.2 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs.

**Constraints that shape the design.** Rules-based eligibility logic with the rule text shown; The assistant never denies a claim; Result says may qualify not does qualify

**Label in this use case.** For "Benefits Eligibility Screening Assistant": Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned eligibility.

## 2. Choose the signals

Your strongest signal is **Rule match per programme** (which rules are met and unmet). Its rule: From the rules engine. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

23.7% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.892 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.454.

## 4. Baseline against the stronger design

The honest evaluation is 0.438 macro-F1 lower than the optimistic one. A frozen model scores 0.837 on the next month and 0.454 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.892 |
| Macro-F1, honest time split | 0.454 |
| Macro-F1, frozen model next month | 0.837 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 23.7% |

## 5. An edge case from the blueprint

**Rule change.** a law changes thresholds. Planned response: Versioned rules and tests. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5700 |
| `duplicate_share` | 0.23737 |
| `random_split_with_leak.macro_f1` | 0.89232 |
| `random_split_with_leak.ece` | 0.12868 |
| `time_split_clean.macro_f1` | 0.454 |
| `time_split_clean.ece` | 0.053366 |
| `frozen_model_next_month.macro_f1` | 0.83699 |
| `frozen_model_next_month.ece` | 0.1186 |
| `frozen_model_months_6_7.macro_f1` | 0.454 |
| `frozen_model_months_6_7.ece` | 0.053366 |

</details>
