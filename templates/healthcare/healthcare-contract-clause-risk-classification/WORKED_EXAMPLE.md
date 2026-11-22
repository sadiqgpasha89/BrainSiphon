# Healthcare Contract Clause Risk Classification: worked example

> Run on synthetic data with `nlp` engine, seed 34465, knobs {"n_docs": 6710}, in 14.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language.

**Constraints that shape the design.** Legal counsel makes legal determinations and approves changes and the classifier only flags and ranks; Every flag cites the clause span and the playbook position; Deterministic policy checks run beside the model

**Label in this use case.** For "Healthcare Contract Clause Risk Classification": Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Splitting by clause not by contract.

## 2. Choose the signals

Your strongest signal is **Playbook deviation score** (semantic and structural distance from approved clause language). Its rule: Playbook version. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.8% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.901 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.463.

## 4. Baseline against the stronger design

The honest evaluation is 0.438 macro-F1 lower than the optimistic one. A frozen model scores 0.828 on the next month and 0.463 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.901 |
| Macro-F1, honest time split | 0.463 |
| Macro-F1, frozen model next month | 0.828 |
| Calibration error, honest split | 0.049 |
| Duplicate share | 25.8% |

## 5. An edge case from the blueprint

**Scanned contract with poor text.** clauses are mis-segmented. Planned response: OCR confidence gate and a manual route. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6710 |
| `duplicate_share` | 0.25797 |
| `random_split_with_leak.macro_f1` | 0.90138 |
| `random_split_with_leak.ece` | 0.11154 |
| `time_split_clean.macro_f1` | 0.46298 |
| `time_split_clean.ece` | 0.048614 |
| `frozen_model_next_month.macro_f1` | 0.82803 |
| `frozen_model_next_month.ece` | 0.10202 |
| `frozen_model_months_6_7.macro_f1` | 0.46298 |
| `frozen_model_months_6_7.ece` | 0.048614 |

</details>
