# Single-Cell RNA Cell-Type Annotation: worked example

> Run on synthetic data with `multiclass` engine, seed 50530, knobs {"n": 11410, "label_noise": 0.084, "dup_share": 0.328}, in 1.1 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Annotate millions of cells with cell types automatically, flagging novel populations for biologists.

**Constraints that shape the design.** Batch effects across labs; Novel cell types; Reference atlas versions

**Label in this use case.** For "Single-Cell RNA Cell-Type Annotation": Annotate millions of cells with cell types automatically, flagging novel populations for biologists. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test batches seen in training.

## 2. Choose the signals

Your strongest signal is **Highly variable gene set** (selected by dispersion across batches). Its rule: Fix set at training. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.040. The rare class grows from 6.3% of training rows to 14.8% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.815 for the multinomial baseline and 0.794 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 31.6% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 24.7% |
| Macro-F1, baseline | 0.815 |
| Macro-F1, challenger | 0.794 |
| Calibration error, baseline versus challenger | 0.030 vs 0.054 |
| Score inflation from a leaky random split | 0.040 |

## 5. An edge case from the blueprint

**New tissue not in reference.** annotations wrong with confidence. Planned response: Out-of-reference detection and refusal. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11410 |
| `train_rows` | 6699 |
| `test_rows` | 2853 |
| `majority_class_accuracy` | 0.24746 |
| `baseline_lr.macro_f1` | 0.81475 |
| `baseline_lr.accuracy` | 0.82545 |
| `baseline_lr.ece` | 0.030319 |
| `baseline_lr.recall_by_class` | 0.9717, 0.9886, 0.7513, 0.6067, 0.7221 |
| `baseline_lr.confusable_pair_error` | 0.31622 |
| `challenger_hgb.macro_f1` | 0.79364 |
| `challenger_hgb.accuracy` | 0.80512 |
| `challenger_hgb.ece` | 0.054402 |
| `challenger_hgb.recall_by_class` | 0.966, 0.9821, 0.718, 0.5566, 0.7126 |
| `challenger_hgb.confusable_pair_error` | 0.35856 |
| `random_split_challenger_macro_f1` | 0.83373 |
| `leaky_split_inflation` | 0.04009 |
| `test_class_shares` | 0.2475, 0.2159, 0.2001, 0.1889, 0.1476 |
| `train_class_shares` | 0.3381, 0.2556, 0.1866, 0.1569, 0.06285 |

</details>
