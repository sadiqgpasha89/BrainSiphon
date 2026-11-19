# Insider Trading & Market Abuse Surveillance: worked example

> Run on synthetic data with `nlp` engine, seed 69967, knobs {"n_docs": 4950}, in 1.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review.

**Constraints that shape the design.** Records retention per MiFID II / SEC rules; Chinese-wall boundaries; Alert volume under compliance capacity

**Label in this use case.** For "Insider Trading & Market Abuse Surveillance": Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Enforcement cases are a tiny biased positive set.

## 2. Choose the signals

Your strongest signal is **Pre-announcement abnormal return** (cumulative abnormal return relative to a market model). Its rule: Event dates must be public timestamps. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.3% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.900 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.476.

## 4. Baseline against the stronger design

The honest evaluation is 0.424 macro-F1 lower than the optimistic one. A frozen model scores 0.795 on the next month and 0.476 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.900 |
| Macro-F1, honest time split | 0.476 |
| Macro-F1, frozen model next month | 0.795 |
| Calibration error, honest split | 0.043 |
| Duplicate share | 25.3% |

## 5. An edge case from the blueprint

**Earnings season floods alerts.** review queue overflows and genuine cases age out. Planned response: Per-event alert budget with ranking and sampling. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 4950 |
| `duplicate_share` | 0.25273 |
| `random_split_with_leak.macro_f1` | 0.90046 |
| `random_split_with_leak.ece` | 0.14438 |
| `time_split_clean.macro_f1` | 0.47597 |
| `time_split_clean.ece` | 0.043003 |
| `frozen_model_next_month.macro_f1` | 0.79456 |
| `frozen_model_next_month.ece` | 0.10461 |
| `frozen_model_months_6_7.macro_f1` | 0.47597 |
| `frozen_model_months_6_7.ece` | 0.043003 |

</details>
