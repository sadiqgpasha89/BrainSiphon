# Materials Selection Assistant: worked example

> Run on synthetic data with `multiclass` engine, seed 8935, knobs {"n": 14560, "label_noise": 0.071, "dup_share": 0.444}, in 2.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use.

**Constraints that shape the design.** Each material cites its data source; Safety-critical selections need test data; Engineers decide

**Label in this use case.** For "Materials Selection Assistant": Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Unverified web data.

## 2. Choose the signals

Your strongest signal is **Required property ranges** (strength, temperature and corrosion needs). Its rule: From requirements. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.037. The rare class grows from 5.8% of training rows to 14.5% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.800 for the multinomial baseline and 0.774 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 26.9% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 26.3% |
| Macro-F1, baseline | 0.800 |
| Macro-F1, challenger | 0.774 |
| Calibration error, baseline versus challenger | 0.019 vs 0.038 |
| Score inflation from a leaky random split | 0.037 |

## 5. An edge case from the blueprint

**Conflicting data.** two sources give different values. Planned response: Show both and flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 14560 |
| `train_rows` | 7391 |
| `test_rows` | 3640 |
| `majority_class_accuracy` | 0.26264 |
| `baseline_lr.macro_f1` | 0.80045 |
| `baseline_lr.accuracy` | 0.82033 |
| `baseline_lr.ece` | 0.018707 |
| `baseline_lr.recall_by_class` | 0.9425, 0.9501, 0.726, 0.5444, 0.8242 |
| `baseline_lr.confusable_pair_error` | 0.26893 |
| `challenger_hgb.macro_f1` | 0.7735 |
| `challenger_hgb.accuracy` | 0.79533 |
| `challenger_hgb.ece` | 0.038334 |
| `challenger_hgb.recall_by_class` | 0.9341, 0.9361, 0.6901, 0.4975, 0.7902 |
| `challenger_hgb.confusable_pair_error` | 0.30835 |
| `random_split_challenger_macro_f1` | 0.81043 |
| `leaky_split_inflation` | 0.03693 |
| `test_class_shares` | 0.2626, 0.2365, 0.1915, 0.164, 0.1453 |
| `train_class_shares` | 0.332, 0.2506, 0.1962, 0.1633, 0.05791 |

</details>
