# Interconnection Application Triage: worked example

> Run on synthetic data with `multiclass` engine, seed 13033, knobs {"n": 13530, "label_noise": 0.073, "dup_share": 0.361}, in 2.4 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly.

**Constraints that shape the design.** Completeness check in minutes; Route by study type; Engineers decide on the study outcome

**Label in this use case.** For "Interconnection Application Triage": Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Priority for large applicants.

## 2. Choose the signals

Your strongest signal is **Document completeness** (required forms and data present). Its rule: From the application. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by -0.000. The rare class grows from 5.8% of training rows to 14.2% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.878 for the multinomial baseline and 0.865 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 30.3% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 25.0% |
| Macro-F1, baseline | 0.878 |
| Macro-F1, challenger | 0.865 |
| Calibration error, baseline versus challenger | 0.023 vs 0.017 |
| Score inflation from a leaky random split | -0.000 |

## 5. An edge case from the blueprint

**Wrong document.** a form is the wrong type. Planned response: Document type checks and a request for correction. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 13530 |
| `train_rows` | 7764 |
| `test_rows` | 3383 |
| `majority_class_accuracy` | 0.25037 |
| `baseline_lr.macro_f1` | 0.87795 |
| `baseline_lr.accuracy` | 0.8862 |
| `baseline_lr.ece` | 0.022943 |
| `baseline_lr.recall_by_class` | 1, 0.9987, 0.7635, 0.6305, 1 |
| `baseline_lr.confusable_pair_error` | 0.30332 |
| `challenger_hgb.macro_f1` | 0.86466 |
| `challenger_hgb.accuracy` | 0.87319 |
| `challenger_hgb.ece` | 0.017 |
| `challenger_hgb.recall_by_class` | 1, 0.9962, 0.6841, 0.6462, 0.9958 |
| `challenger_hgb.confusable_pair_error` | 0.33491 |
| `random_split_challenger_macro_f1` | 0.8642 |
| `leaky_split_inflation` | -0.00045954 |
| `test_class_shares` | 0.2504, 0.2335, 0.1862, 0.188, 0.1419 |
| `train_class_shares` | 0.3367, 0.2533, 0.1884, 0.1636, 0.05796 |

</details>
