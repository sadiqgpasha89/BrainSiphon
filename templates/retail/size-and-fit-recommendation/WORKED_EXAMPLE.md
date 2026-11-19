# Size & Fit Recommendation: worked example

> Run on synthetic data with `multiclass` engine, seed 86654, knobs {"n": 13550, "label_noise": 0.075, "dup_share": 0.335}, in 1.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend the right size per item and shopper to cut size-related returns without discouraging purchase.

**Constraints that shape the design.** Brand-specific sizing; Privacy of body measurements; Under 50 ms

**Label in this use case.** For "Size & Fit Recommendation": Recommend the right size per item and shopper to cut size-related returns without discouraging purchase. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using kept items as correct without checking wear.

## 2. Choose the signals

Your strongest signal is **Brand-size offset** (learned bias of a brand versus a reference scale). Its rule: Estimated on matured returns. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.017. The rare class grows from 6.0% of training rows to 14.8% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.817 for the multinomial baseline and 0.802 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 29.4% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.9% |
| Macro-F1, baseline | 0.817 |
| Macro-F1, challenger | 0.802 |
| Calibration error, baseline versus challenger | 0.017 vs 0.025 |
| Score inflation from a leaky random split | 0.017 |

## 5. An edge case from the blueprint

**Brand changes pattern mid-season.** latent size drifts. Planned response: Per-item drift monitor and quick re-estimate. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13550 |
| `train_rows` | 8103 |
| `test_rows` | 3388 |
| `majority_class_accuracy` | 0.25945 |
| `baseline_lr.macro_f1` | 0.81654 |
| `baseline_lr.accuracy` | 0.82881 |
| `baseline_lr.ece` | 0.017498 |
| `baseline_lr.recall_by_class` | 0.9727, 0.9521, 0.6752, 0.6436, 0.814 |
| `baseline_lr.confusable_pair_error` | 0.29356 |
| `challenger_hgb.macro_f1` | 0.80195 |
| `challenger_hgb.accuracy` | 0.81434 |
| `challenger_hgb.ece` | 0.025397 |
| `challenger_hgb.recall_by_class` | 0.9727, 0.9362, 0.6421, 0.625, 0.806 |
| `challenger_hgb.confusable_pair_error` | 0.31663 |
| `random_split_challenger_macro_f1` | 0.81921 |
| `leaky_split_inflation` | 0.017264 |
| `test_class_shares` | 0.2594, 0.222, 0.1963, 0.1747, 0.1476 |
| `train_class_shares` | 0.3372, 0.2611, 0.1877, 0.1536, 0.06035 |

</details>
