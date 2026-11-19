# Claims Triage & Straight-Through Processing: worked example

> Run on synthetic data with `multiclass` engine, seed 15658, knobs {"n": 11690, "label_noise": 0.069, "dup_share": 0.411}, in 1.2 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk.

**Constraints that shape the design.** Automatic payment only for claims below a set value and risk limit; Fair-treatment and vulnerable-customer rules applied at triage; Every routing decision explained in words the handler can read

**Label in this use case.** For "Claims Triage & Straight-Through Processing": Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from past routing decisions, so the model learns the old process and its biases.

## 2. Choose the signals

Your strongest signal is **First notice text** (encoder embedding of the claim description mapped to complexity classes). Its rule: Language varies, so test across channels. In the starter, the closest executable idea is **separating feature (x1)**: the feature that best separates the classes. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

Repeat entities on both sides of a random split inflate macro-F1 by 0.036. The rare class grows from 6.0% of training rows to 15.2% of the test period, so the prior drifts.

## 4. Baseline against the stronger design

Macro-F1 is 0.831 for the multinomial baseline and 0.810 for the boosted model; the baseline is ahead: the added complexity did not earn its place on this run. The confusable pair is mistaken 29.6% of the time by the baseline.

| Result | Value |
|---|---|
| Majority-class accuracy | 28.7% |
| Macro-F1, baseline | 0.831 |
| Macro-F1, challenger | 0.810 |
| Calibration error, baseline versus challenger | 0.020 vs 0.041 |
| Score inflation from a leaky random split | 0.036 |

## 5. An edge case from the blueprint

**Catastrophe surge.** A catastrophe produces a surge of claims that overwhelms normal routing and capacity. Planned response: Switch to surge rules with priority queues for vulnerable and high-severity claims and pre-agreed overflow handlers. Write the test that replays this case through your pipeline before you tune anything.

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
| `rows` | 11690 |
| `train_rows` | 6227 |
| `test_rows` | 2923 |
| `majority_class_accuracy` | 0.28703 |
| `baseline_lr.macro_f1` | 0.83082 |
| `baseline_lr.accuracy` | 0.85563 |
| `baseline_lr.ece` | 0.020028 |
| `baseline_lr.recall_by_class` | 0.9893, 0.9795, 0.7716, 0.5956, 0.7955 |
| `baseline_lr.confusable_pair_error` | 0.29622 |
| `challenger_hgb.macro_f1` | 0.8101 |
| `challenger_hgb.accuracy` | 0.8375 |
| `challenger_hgb.ece` | 0.041131 |
| `challenger_hgb.recall_by_class` | 0.9869, 0.9842, 0.7104, 0.5911, 0.7551 |
| `challenger_hgb.confusable_pair_error` | 0.32704 |
| `random_split_challenger_macro_f1` | 0.84604 |
| `leaky_split_inflation` | 0.035945 |
| `test_class_shares` | 0.287, 0.2166, 0.1902, 0.154, 0.1522 |
| `train_class_shares` | 0.338, 0.2542, 0.1938, 0.1538, 0.06006 |

</details>
