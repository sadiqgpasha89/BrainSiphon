# Investment Property Screening & Underwriting: worked example

> Run on synthetic data with `generative` engine, seed 40910, knobs {"n": 315}, in 1.0 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.

**Constraints that shape the design.** Every assumption such as rent growth, vacancy and exit yield is stated and editable; An analyst approves every underwriting before it leaves the team; Each figure in the summary cites its source document

**Label in this use case.** For "Investment Property Screening & Underwriting": Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past deals are those the team chose to pursue, so the data is biased toward what they already liked.

## 2. Choose the signals

Your strongest signal is **Yield vs target** (going-in cap rate minus the fund's target cap rate). Its rule: Cap rates are computed on estimated income, so mark the income source. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 17.8% under the strict judge and 48.9% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.37).

## 4. Baseline against the stronger design

Version 2 passes 60.3% against 48.9%: a difference of 11.4% with a 95% interval of 3.5% to 18.7%. With only 60 items the interval on one pass rate is 0.22 wide, against 0.11 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 17.8% |
| Pass rate v1, fuzzy judge | 48.9% |
| Pass rate v2, fuzzy judge | 60.3% |
| v2 minus v1, 95% interval | 11.4% (3.5% to 18.7%) |
| Judge agreement (kappa) | 0.37 |

## 5. An edge case from the blueprint

**Missing rent roll.** The rent roll is missing, so income cannot be checked. Planned response: Ask for it, and mark any returns that depend on assumed income as provisional. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 315 |
| `v1_pass_rate_strict_judge` | 0.17778 |
| `v1_pass_rate_fuzzy_judge` | 0.48889 |
| `v2_pass_rate_fuzzy_judge` | 0.60317 |
| `v1_pass_rate_ci95` | 0.4348, 0.546 |
| `v2_minus_v1` | 0.11429 |
| `v2_minus_v1_ci95` | 0.03484, 0.1873 |
| `judge_agreement_kappa_v1` | 0.36874 |
| `judge_disagreement_share_v1` | 0.31111 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.46984 |
| `v1_failure_share_by_check.date_correct` | 0.1746 |
| `v1_failure_share_by_check.within_length` | 0.031746 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.057143 |
| `ci_width_at_60_items` | 0.21667 |
| `ci_width_at_full_set` | 0.11127 |

</details>
