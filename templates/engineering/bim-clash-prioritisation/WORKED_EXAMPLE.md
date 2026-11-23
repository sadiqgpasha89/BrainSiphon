# BIM Clash Prioritisation: worked example

> Run on synthetic data with `multiclass` engine, seed 36253, knobs {"n": 12800, "label_noise": 0.088, "dup_share": 0.438}, in 3.0 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps.

**Constraints that shape the design.** Every clash stays in the register; Critical clashes flagged within 1 day of the model update; Coordinators decide

**Label in this use case.** For "BIM Clash Prioritisation": Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overlap volume as severity.

## 2. Choose the signals

Your strongest signal is **Element types in clash** (systems involved). Its rule: From the model. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.034. The rare class grows from 5.8% of training rows to 13.0% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.814 for the multinomial baseline and 0.803 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 33.9% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 27.2% |
| Macro-F1, baseline | 0.814 |
| Macro-F1, challenger | 0.803 |
| Calibration error, baseline versus challenger | 0.011 vs 0.044 |
| Score inflation from a leaky random split | 0.034 |

## 5. An edge case from the blueprint

**Model lag.** one discipline model is outdated. Planned response: Model freshness flags. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 12800 |
| `train_rows` | 6625 |
| `test_rows` | 3200 |
| `majority_class_accuracy` | 0.27187 |
| `baseline_lr.macro_f1` | 0.81435 |
| `baseline_lr.accuracy` | 0.82 |
| `baseline_lr.ece` | 0.011018 |
| `baseline_lr.recall_by_class` | 0.9586, 0.9219, 0.6864, 0.5468, 0.9543 |
| `baseline_lr.confusable_pair_error` | 0.33851 |
| `challenger_hgb.macro_f1` | 0.80337 |
| `challenger_hgb.accuracy` | 0.80844 |
| `challenger_hgb.ece` | 0.043814 |
| `challenger_hgb.recall_by_class` | 0.9437, 0.9247, 0.6656, 0.5385, 0.9351 |
| `challenger_hgb.confusable_pair_error` | 0.35405 |
| `random_split_challenger_macro_f1` | 0.83729 |
| `leaky_split_inflation` | 0.03392 |
| `test_class_shares` | 0.2719, 0.2159, 0.1953, 0.1869, 0.13 |
| `train_class_shares` | 0.3351, 0.2515, 0.1928, 0.1626, 0.05811 |

</details>
