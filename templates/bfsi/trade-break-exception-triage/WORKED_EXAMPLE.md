# Trade Break & Reconciliation Exception Triage: worked example

> Run on synthetic data with `multiclass` engine, seed 76661, knobs {"n": 12640, "label_noise": 0.09, "dup_share": 0.281}, in 1.3 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix.

**Constraints that shape the design.** Auto-resolve only breaks with a reversible fix; Four-eyes check on any ledger change; Break ageing targets by type

**Label in this use case.** For "Trade Break & Reconciliation Exception Triage": Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from past manual assignment.

## 2. Choose the signals

Your strongest signal is **Field mismatch pattern** (which fields differ between sides). Its rule: Needs normalisation. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.020. The rare class grows from 5.8% of training rows to 15.5% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.802 for the multinomial baseline and 0.784 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 33.6% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.4% |
| Macro-F1, baseline | 0.802 |
| Macro-F1, challenger | 0.784 |
| Calibration error, baseline versus challenger | 0.012 vs 0.040 |
| Score inflation from a leaky random split | 0.020 |

## 5. An edge case from the blueprint

**Systemic mismatch.** a static data error creates thousands of breaks. Planned response: Cluster detection and one root-cause ticket. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Choose by per-class recall for the classes that cost the most, not by accuracy. Keep the entity-safe chronological split.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 12640 |
| `train_rows` | 7917 |
| `test_rows` | 3160 |
| `majority_class_accuracy` | 0.25411 |
| `baseline_lr.macro_f1` | 0.80226 |
| `baseline_lr.accuracy` | 0.81424 |
| `baseline_lr.ece` | 0.012258 |
| `baseline_lr.recall_by_class` | 0.9639, 0.9333, 0.693, 0.5214, 0.8959 |
| `baseline_lr.confusable_pair_error` | 0.33557 |
| `challenger_hgb.macro_f1` | 0.78426 |
| `challenger_hgb.accuracy` | 0.79525 |
| `challenger_hgb.ece` | 0.039636 |
| `challenger_hgb.recall_by_class` | 0.9577, 0.9141, 0.6424, 0.5429, 0.851 |
| `challenger_hgb.confusable_pair_error` | 0.35403 |
| `random_split_challenger_macro_f1` | 0.80401 |
| `leaky_split_inflation` | 0.019755 |
| `test_class_shares` | 0.2541, 0.2136, 0.2, 0.1772, 0.1551 |
| `train_class_shares` | 0.338, 0.2596, 0.1897, 0.1544, 0.05836 |

</details>
