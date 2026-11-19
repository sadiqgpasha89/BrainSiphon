# Trade Compliance: Denied-Party & Export Control Screening: worked example

> Run on synthetic data with `nlp` engine, seed 44923, knobs {"n_docs": 6750}, in 2.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits.

**Constraints that shape the design.** Near-100% recall on listed parties; 50% ownership rule; List updates within hours

**Label in this use case.** For "Trade Compliance: Denied-Party & Export Control Screening": Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test on easy names.

## 2. Choose the signals

Your strongest signal is **Fuzzy name similarity** (learned embedding similarity). Its rule: Alias coverage. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

24.1% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.868 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.439.

## 4. Baseline against the stronger design

The honest evaluation is 0.429 macro-F1 lower than the optimistic one. A frozen model scores 0.833 on the next month and 0.439 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.868 |
| Macro-F1, honest time split | 0.439 |
| Macro-F1, frozen model next month | 0.833 |
| Calibration error, honest split | 0.053 |
| Duplicate share | 24.1% |

## 5. An edge case from the blueprint

**List update adds many entities.** index lag causes missed hits. Planned response: Streaming index update and re-screening of open shipments. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 6750 |
| `duplicate_share` | 0.24119 |
| `random_split_with_leak.macro_f1` | 0.86764 |
| `random_split_with_leak.ece` | 0.11398 |
| `time_split_clean.macro_f1` | 0.43882 |
| `time_split_clean.ece` | 0.05347 |
| `frozen_model_next_month.macro_f1` | 0.83255 |
| `frozen_model_next_month.ece` | 0.11361 |
| `frozen_model_months_6_7.macro_f1` | 0.43882 |
| `frozen_model_months_6_7.ece` | 0.05347 |

</details>
