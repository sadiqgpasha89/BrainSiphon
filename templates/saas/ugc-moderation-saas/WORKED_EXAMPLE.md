# UGC Moderation as a Service: worked example

> Run on synthetic data with `nlp` engine, seed 12711, knobs {"n_docs": 5940}, in 2.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails.

**Constraints that shape the design.** Per-tenant thresholds; Latency inline; Explainable decisions

**Label in this use case.** For "UGC Moderation as a Service": Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test data from one tenant.

## 2. Choose the signals

Your strongest signal is **Category scores** (multi-label calibrated scores). Its rule: Calibration. In the starter, the closest executable idea is **topic terms**: words and phrases most associated with each class. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

25.2% of documents are copies of others and one class leaks through a header token. A random split with the leak scores 0.893 macro-F1; the honest split, with threads kept together and the leak removed, scores 0.435.

## 4. Baseline against the stronger design

The honest evaluation is 0.458 macro-F1 lower than the optimistic one. A frozen model scores 0.791 on the next month and 0.435 two months out, so drift costs accuracy within weeks.

| Result | Value |
|---|---|
| Macro-F1, random split with a leak | 0.893 |
| Macro-F1, honest time split | 0.435 |
| Macro-F1, frozen model next month | 0.791 |
| Calibration error, honest split | 0.039 |
| Duplicate share | 25.2% |

## 5. An edge case from the blueprint

**Tenant policy change floods the review queue.** a tenant tightens its policy and the review queue is flooded with newly flagged content. Planned response: Policy simulation and ramped rollout. Write the test that replays this case through your pipeline before you tune anything.

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
| `docs` | 5940 |
| `duplicate_share` | 0.25152 |
| `random_split_with_leak.macro_f1` | 0.8927 |
| `random_split_with_leak.ece` | 0.12606 |
| `time_split_clean.macro_f1` | 0.43484 |
| `time_split_clean.ece` | 0.038989 |
| `frozen_model_next_month.macro_f1` | 0.79111 |
| `frozen_model_next_month.ece` | 0.096605 |
| `frozen_model_months_6_7.macro_f1` | 0.43484 |
| `frozen_model_months_6_7.ece` | 0.038989 |

</details>
