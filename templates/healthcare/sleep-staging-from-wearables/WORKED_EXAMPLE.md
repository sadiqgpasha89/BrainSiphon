# Sleep Staging from Wearables: worked example

> Run on synthetic data with `multiclass` engine, seed 33774, knobs {"n": 14610, "label_noise": 0.059, "dup_share": 0.386}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening.

**Constraints that shape the design.** Battery-limited sampling; Diversity of users; Privacy

**Label in this use case.** For "Sleep Staging from Wearables": Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Healthy young validation cohort only.

## 2. Choose the signals

Your strongest signal is **Heart-rate variability features** (HRV in 30s epochs). Its rule: Artifact handling. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.019. The rare class grows from 5.6% of training rows to 13.7% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.848 for the multinomial baseline and 0.834 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 29.7% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 28.1% |
| Macro-F1, baseline | 0.848 |
| Macro-F1, challenger | 0.834 |
| Calibration error, baseline versus challenger | 0.018 vs 0.028 |
| Score inflation from a leaky random split | 0.019 |

## 5. An edge case from the blueprint

**Shift workers with irregular sleep.** stage priors wrong. Planned response: Personal circadian adaptation. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14610 |
| `train_rows` | 8002 |
| `test_rows` | 3653 |
| `majority_class_accuracy` | 0.28114 |
| `baseline_lr.macro_f1` | 0.84828 |
| `baseline_lr.accuracy` | 0.85491 |
| `baseline_lr.ece` | 0.017986 |
| `baseline_lr.recall_by_class` | 0.9445, 0.9168, 0.7678, 0.624, 0.984 |
| `baseline_lr.confusable_pair_error` | 0.29652 |
| `challenger_hgb.macro_f1` | 0.83424 |
| `challenger_hgb.accuracy` | 0.84123 |
| `challenger_hgb.ece` | 0.028347 |
| `challenger_hgb.recall_by_class` | 0.9299, 0.9242, 0.7141, 0.6256, 0.9739 |
| `challenger_hgb.confusable_pair_error` | 0.32224 |
| `random_split_challenger_macro_f1` | 0.85366 |
| `leaky_split_inflation` | 0.019421 |
| `test_class_shares` | 0.2811, 0.2204, 0.1886, 0.1733, 0.1366 |
| `train_class_shares` | 0.3377, 0.2613, 0.1866, 0.1581, 0.05636 |

</details>
