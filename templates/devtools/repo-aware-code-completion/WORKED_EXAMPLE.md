# Repository-Aware Code Completion: worked example

> Run on synthetic data with `generative` engine, seed 15102, knobs {"n": 243}, in 1.7 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase.

**Constraints that shape the design.** Suggestion latency under 200 ms; Context limited to repositories the developer can access; Suggestions never include secrets

**Label in this use case.** For "Repository-Aware Code Completion": Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Shown-suggestion metrics.

## 2. Choose the signals

Your strongest signal is **Cursor and file context** (code around the cursor). Its rule: From the editor. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.7% under the strict judge and 51.4% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.34).

## 4. Baseline against the stronger design

Version 2 passes 59.3% against 51.4%: a difference of 7.8% with a 95% interval of -0.8% to 16.0%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.7% |
| Pass rate v1, fuzzy judge | 51.4% |
| Pass rate v2, fuzzy judge | 59.3% |
| v2 minus v1, 95% interval | 7.8% (-0.8% to 16.0%) |
| Judge agreement (kappa) | 0.34 |

## 5. An edge case from the blueprint

**Private repository access.** the developer lacks access to a related file. Planned response: Access checks at retrieval. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 243 |
| `v1_pass_rate_strict_judge` | 0.17695 |
| `v1_pass_rate_fuzzy_judge` | 0.5144 |
| `v2_pass_rate_fuzzy_judge` | 0.59259 |
| `v1_pass_rate_ci95` | 0.4608, 0.5802 |
| `v2_minus_v1` | 0.078189 |
| `v2_minus_v1_ci95` | -0.00823, 0.1605 |
| `judge_agreement_kappa_v1` | 0.33743 |
| `judge_disagreement_share_v1` | 0.33745 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.45679 |
| `v1_failure_share_by_check.date_correct` | 0.17695 |
| `v1_failure_share_by_check.within_length` | 0.0041152 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.049383 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.11944 |

</details>
