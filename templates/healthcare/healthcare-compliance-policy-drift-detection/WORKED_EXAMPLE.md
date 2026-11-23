# Healthcare Compliance Policy Drift Detection: worked example

> Run on synthetic data with `nlp` engine, seed 54001, knobs {"n_docs": 6840}, in 14.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity.

**Constraints that shape the design.** The policy owner validates drift and approves any policy or process change; Semantic comparison proposes candidates and configuration rules decide measurable mismatches; Each candidate cites the policy text and the observed evidence

**Label in this use case.** For "Healthcare Compliance Policy Drift Detection": Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating text distance as risk.

## 2. Choose the signals

Your strongest signal is **Semantic divergence** (distance between policy statements and procedure statements). Its rule: Version pair. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.9% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.908 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.501.

## 4. Baseline against the stronger design

The honest evaluation is 0.407 macro-F1 lower than the optimistic one. A frozen model scores 0.850 on the next month and 0.501 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.908 |
| Macro-F1, honest time split | 0.501 |
| Macro-F1, frozen model next month | 0.850 |
| Calibration error, honest split | 0.042 |
| Duplicate share | 24.9% |

## 5. An edge case from the blueprint

**Policy updated but procedures lag.** expected drift is flagged as a finding. Planned response: Effective-date grace period. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6840 |
| `duplicate_share` | 0.24942 |
| `random_split_with_leak.macro_f1` | 0.90793 |
| `random_split_with_leak.ece` | 0.11814 |
| `time_split_clean.macro_f1` | 0.50132 |
| `time_split_clean.ece` | 0.041684 |
| `frozen_model_next_month.macro_f1` | 0.84977 |
| `frozen_model_next_month.ece` | 0.11448 |
| `frozen_model_months_6_7.macro_f1` | 0.50132 |
| `frozen_model_months_6_7.ece` | 0.041684 |

</details>
