# Code Completion Assistant: worked example

> Run on synthetic data with `generative` engine, seed 1402, knobs {"n": 252}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards.

**Constraints that shape the design.** First token under 200 ms; Repo-aware context; Licence compliance

**Label in this use case.** For "Code Completion Assistant": Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Public benchmarks contaminated.

## 2. Choose the signals

Your strongest signal is **Context window quality** (relevant files retrieved). Its rule: Retrieval. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.9% under the strict judge and 49.2% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.33).

## 4. Baseline against the stronger design

Version 2 passes 58.3% against 49.2%: a difference of 9.1% with a 95% interval of -0.0% to 17.1%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.13 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.9% |
| Pass rate v1, fuzzy judge | 49.2% |
| Pass rate v2, fuzzy judge | 58.3% |
| v2 minus v1, 95% interval | 9.1% (-0.0% to 17.1%) |
| Judge agreement (kappa) | 0.33 |

## 5. An edge case from the blueprint

**Large monorepo context.** slow retrieval and stale index. Planned response: Incremental indexing and fallback to local context. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 252 |
| `v1_pass_rate_strict_judge` | 0.15873 |
| `v1_pass_rate_fuzzy_judge` | 0.49206 |
| `v2_pass_rate_fuzzy_judge` | 0.58333 |
| `v1_pass_rate_ci95` | 0.4325, 0.5635 |
| `v2_minus_v1` | 0.09127 |
| `v2_minus_v1_ci95` | -9.921e-05, 0.1706 |
| `judge_agreement_kappa_v1` | 0.32603 |
| `judge_disagreement_share_v1` | 0.33333 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.46825 |
| `v1_failure_share_by_check.date_correct` | 0.12302 |
| `v1_failure_share_by_check.within_length` | 0.027778 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.051587 |
| `ci_width_at_60_items` | 0.23375 |
| `ci_width_at_full_set` | 0.13095 |

</details>
