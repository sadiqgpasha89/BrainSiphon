# Prepaid Recharge & Top-up Prediction: worked example

> Run on synthetic data with `generative` engine, seed 22495, knobs {"n": 271}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour.

**Constraints that shape the design.** Daily prediction for 100M prepaid lines; Reminders honour consent and frequency caps; Forecasts for finance with intervals

**Label in this use case.** For "Prepaid Recharge & Top-up Prediction": Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting zero recharge as churn.

## 2. Choose the signals

Your strongest signal is **Days since last recharge** (gap to the usual interval). Its rule: Per customer. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.7% under the strict judge and 47.2% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.39).

## 4. Baseline against the stronger design

Version 2 passes 62.0% against 47.2%: a difference of 14.8% with a 95% interval of 5.9% to 23.2%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.7% |
| Pass rate v1, fuzzy judge | 47.2% |
| Pass rate v2, fuzzy judge | 62.0% |
| v2 minus v1, 95% interval | 14.8% (5.9% to 23.2%) |
| Judge agreement (kappa) | 0.39 |

## 5. An edge case from the blueprint

**Dual-SIM users.** activity moves to the other SIM. Planned response: Treat quiet lines carefully and avoid churn labels. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 271 |
| `v1_pass_rate_strict_judge` | 0.17712 |
| `v1_pass_rate_fuzzy_judge` | 0.47232 |
| `v2_pass_rate_fuzzy_judge` | 0.61993 |
| `v1_pass_rate_ci95` | 0.417, 0.5278 |
| `v2_minus_v1` | 0.1476 |
| `v2_minus_v1_ci95` | 0.05895, 0.2325 |
| `judge_agreement_kappa_v1` | 0.38771 |
| `judge_disagreement_share_v1` | 0.2952 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.50185 |
| `v1_failure_share_by_check.date_correct` | 0.16974 |
| `v1_failure_share_by_check.within_length` | 0.02952 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.059041 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.11079 |

</details>
