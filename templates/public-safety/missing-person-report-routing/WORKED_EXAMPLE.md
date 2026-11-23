# Missing Person Report Completeness and Routing: worked example

> Run on synthetic data with `generative` engine, seed 62816, knobs {"n": 272}, in 1.8 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response.

**Constraints that shape the design.** Every report goes to a person immediately; The tool never lowers priority; Completeness prompts in plain language

**Label in this use case.** For "Missing Person Report Completeness and Routing": Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicted risk scores.

## 2. Choose the signals

Your strongest signal is **Missing fields** (key details not yet collected). Its rule: From the form. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 19.5% under the strict judge and 52.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.35).

## 4. Baseline against the stronger design

Version 2 passes 58.8% against 52.9%: a difference of 5.9% with a 95% interval of -2.6% to 13.6%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 19.5% |
| Pass rate v1, fuzzy judge | 52.9% |
| Pass rate v2, fuzzy judge | 58.8% |
| v2 minus v1, 95% interval | 5.9% (-2.6% to 13.6%) |
| Judge agreement (kappa) | 0.35 |

## 5. An edge case from the blueprint

**Conflicting details.** reports disagree on key facts. Planned response: Show both and ask an officer. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 272 |
| `v1_pass_rate_strict_judge` | 0.19485 |
| `v1_pass_rate_fuzzy_judge` | 0.52941 |
| `v2_pass_rate_fuzzy_judge` | 0.58824 |
| `v1_pass_rate_ci95` | 0.4743, 0.5882 |
| `v2_minus_v1` | 0.058824 |
| `v2_minus_v1_ci95` | -0.02574, 0.136 |
| `judge_agreement_kappa_v1` | 0.35407 |
| `judge_disagreement_share_v1` | 0.33456 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44853 |
| `v1_failure_share_by_check.date_correct` | 0.15441 |
| `v1_failure_share_by_check.within_length` | 0.011029 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.029412 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.11397 |

</details>
