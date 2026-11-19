# Email Assistant & Smart Replies: worked example

> Run on synthetic data with `generative` engine, seed 90956, knobs {"n": 277}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends.

**Constraints that shape the design.** Never auto-send sensitive content; Personal style adaptation; Privacy of email

**Label in this use case.** For "Email Assistant & Smart Replies": Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on generic emails.

## 2. Choose the signals

Your strongest signal is **Draft acceptance rate** (drafts sent with few edits). Its rule: Logging. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 18.1% under the strict judge and 49.1% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 64.3% against 49.1%: a difference of 15.2% with a 95% interval of 7.2% to 22.7%. With only 60 items the interval on one pass rate is 0.27 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 18.1% |
| Pass rate v1, fuzzy judge | 49.1% |
| Pass rate v2, fuzzy judge | 64.3% |
| v2 minus v1, 95% interval | 15.2% (7.2% to 22.7%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Draft invents a commitment or date.** user sends a false promise. Planned response: Highlight proposed commitments and require confirmation. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 277 |
| `v1_pass_rate_strict_judge` | 0.18051 |
| `v1_pass_rate_fuzzy_judge` | 0.49097 |
| `v2_pass_rate_fuzzy_judge` | 0.6426 |
| `v1_pass_rate_ci95` | 0.4403, 0.5523 |
| `v2_minus_v1` | 0.15162 |
| `v2_minus_v1_ci95` | 0.07211, 0.2274 |
| `judge_agreement_kappa_v1` | 0.37182 |
| `judge_disagreement_share_v1` | 0.31047 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.47653 |
| `v1_failure_share_by_check.date_correct` | 0.15162 |
| `v1_failure_share_by_check.within_length` | 0.032491 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.057762 |
| `ci_width_at_60_items` | 0.26667 |
| `ci_width_at_full_set` | 0.11209 |

</details>
