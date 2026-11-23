# Remaining Useful Life Prediction for Rotating Equipment: worked example

> Run on synthetic data with `generative` engine, seed 14375, knobs {"n": 317}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure.

**Constraints that shape the design.** Lead time of at least 14 days for planned work; Predictions with intervals; Failure modes labelled in the CMMS

**Label in this use case.** For "Remaining Useful Life Prediction for Rotating Equipment": Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Dropping censored assets.

## 2. Choose the signals

Your strongest signal is **Vibration band energy trend** (trend in bearing and gear frequency band energy). Its rule: Per asset class and speed. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.3% under the strict judge and 50.2% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.36).

## 4. Baseline against the stronger design

Version 2 passes 57.1% against 50.2%: a difference of 6.9% with a 95% interval of -0.9% to 14.2%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.3% |
| Pass rate v1, fuzzy judge | 50.2% |
| Pass rate v2, fuzzy judge | 57.1% |
| v2 minus v1, 95% interval | 6.9% (-0.9% to 14.2%) |
| Judge agreement (kappa) | 0.36 |

## 5. An edge case from the blueprint

**Few failures.** little data for rare assets. Planned response: Pool by asset class and use physics priors. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 317 |
| `v1_pass_rate_strict_judge` | 0.18297 |
| `v1_pass_rate_fuzzy_judge` | 0.50158 |
| `v2_pass_rate_fuzzy_judge` | 0.57098 |
| `v1_pass_rate_ci95` | 0.4511, 0.5584 |
| `v2_minus_v1` | 0.069401 |
| `v2_minus_v1_ci95` | -0.009464, 0.142 |
| `judge_agreement_kappa_v1` | 0.36405 |
| `judge_disagreement_share_v1` | 0.31861 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.48265 |
| `v1_failure_share_by_check.date_correct` | 0.17981 |
| `v1_failure_share_by_check.within_length` | 0.015773 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.041009 |
| `ci_width_at_60_items` | 0.25042 |
| `ci_width_at_full_set` | 0.10726 |

</details>
