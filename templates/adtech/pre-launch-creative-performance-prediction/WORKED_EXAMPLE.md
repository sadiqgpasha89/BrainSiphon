# Pre-Launch Creative Performance Prediction: worked example

> Run on synthetic data with `generative` engine, seed 69936, knobs {"n": 299}, in 0.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped.

**Constraints that shape the design.** Cold-start creatives; Rank-ordering accuracy matters; Explainable feedback to designers

**Label in this use case.** For "Pre-Launch Creative Performance Prediction": Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training data confounded by budget and targeting.

## 2. Choose the signals

Your strongest signal is **Visual embedding** (image or video encoder embedding). Its rule: Domain tuning. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.7% under the strict judge and 49.5% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.32).

## 4. Baseline against the stronger design

Version 2 passes 56.5% against 49.5%: a difference of 7.0% with a 95% interval of -1.3% to 15.1%. With only 60 items the interval on one pass rate is 0.27 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.7% |
| Pass rate v1, fuzzy judge | 49.5% |
| Pass rate v2, fuzzy judge | 56.5% |
| v2 minus v1, 95% interval | 7.0% (-1.3% to 15.1%) |
| Judge agreement (kappa) | 0.32 |

## 5. An edge case from the blueprint

**New visual trends shift performance drivers.** predictions stale. Planned response: Trend monitoring and frequent retraining. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Agree the rubric with the people who own quality, show that two judges agree before trusting either, size the golden set from the interval you need, and replace the stand-in generator with your model.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `golden_items` | 299 |
| `v1_pass_rate_strict_judge` | 0.15719 |
| `v1_pass_rate_fuzzy_judge` | 0.49498 |
| `v2_pass_rate_fuzzy_judge` | 0.56522 |
| `v1_pass_rate_ci95` | 0.4381, 0.5452 |
| `v2_minus_v1` | 0.070234 |
| `v2_minus_v1_ci95` | -0.01338, 0.1505 |
| `judge_agreement_kappa_v1` | 0.31974 |
| `judge_disagreement_share_v1` | 0.33779 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48161 |
| `v1_failure_share_by_check.date_correct` | 0.13378 |
| `v1_failure_share_by_check.within_length` | 0.013378 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.063545 |
| `ci_width_at_60_items` | 0.26667 |
| `ci_width_at_full_set` | 0.10711 |

</details>
