# Grid Carbon Intensity Forecasting: worked example

> Run on synthetic data with `generative` engine, seed 56484, knobs {"n": 297}, in 1.9 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers.

**Constraints that shape the design.** Hourly forecast for 48 hours; Both average and marginal intensity reported with definitions; Methodology documented

**Label in this use case.** For "Grid Carbon Intensity Forecasting": Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Mixing average and marginal intensity.

## 2. Choose the signals

Your strongest signal is **Renewable forecast** (wind and solar generation forecasts). Its rule: From forecasts. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.2% under the strict judge and 49.2% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.35).

## 4. Baseline against the stronger design

Version 2 passes 61.6% against 49.2%: a difference of 12.5% with a 95% interval of 3.0% to 20.2%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.2% |
| Pass rate v1, fuzzy judge | 49.2% |
| Pass rate v2, fuzzy judge | 61.6% |
| v2 minus v1, 95% interval | 12.5% (3.0% to 20.2%) |
| Judge agreement (kappa) | 0.35 |

## 5. An edge case from the blueprint

**Missing interconnector data.** imports are unknown. Planned response: Fallbacks and a flag. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 297 |
| `v1_pass_rate_strict_judge` | 0.17172 |
| `v1_pass_rate_fuzzy_judge` | 0.49158 |
| `v2_pass_rate_fuzzy_judge` | 0.61616 |
| `v1_pass_rate_ci95` | 0.441, 0.5488 |
| `v2_minus_v1` | 0.12458 |
| `v2_minus_v1_ci95` | 0.0303, 0.202 |
| `judge_agreement_kappa_v1` | 0.35312 |
| `judge_disagreement_share_v1` | 0.31987 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47138 |
| `v1_failure_share_by_check.date_correct` | 0.12458 |
| `v1_failure_share_by_check.within_length` | 0.03367 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.06734 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.10783 |

</details>
