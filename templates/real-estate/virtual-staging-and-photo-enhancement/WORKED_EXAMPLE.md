# Virtual Staging & Photo Enhancement: worked example

> Run on synthetic data with `generative` engine, seed 8904, knobs {"n": 280}, in 0.7 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.

**Constraints that shape the design.** Every staged image carries a visible label and the original is always one click away; Walls, windows, fixtures and views are never altered; Disclosure text shown to buyers wherever the image appears

**Label in this use case.** For "Virtual Staging & Photo Enhancement": Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones.

## 2. Choose the signals

Your strongest signal is **Structure preservation** (edge-map similarity between the original and staged image outside the furniture mask). Its rule: Mask the furniture region, otherwise added furniture lowers the score. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 19.6% under the strict judge and 51.4% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.38).

## 4. Baseline against the stronger design

Version 2 passes 58.6% against 51.4%: a difference of 7.1% with a 95% interval of -0.7% to 15.7%. With only 60 items the interval on one pass rate is 0.23 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 19.6% |
| Pass rate v1, fuzzy judge | 51.4% |
| Pass rate v2, fuzzy judge | 58.6% |
| v2 minus v1, 95% interval | 7.1% (-0.7% to 15.7%) |
| Judge agreement (kappa) | 0.38 |

## 5. An edge case from the blueprint

**Wrong scale furniture.** Furniture generated at the wrong scale makes the room look unreal or misleading. Planned response: Derive scale from the depth map and reject images where furniture sizes are implausible. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 280 |
| `v1_pass_rate_strict_judge` | 0.19643 |
| `v1_pass_rate_fuzzy_judge` | 0.51429 |
| `v2_pass_rate_fuzzy_judge` | 0.58571 |
| `v1_pass_rate_ci95` | 0.45, 0.5714 |
| `v2_minus_v1` | 0.071429 |
| `v2_minus_v1_ci95` | -0.007143, 0.1572 |
| `judge_agreement_kappa_v1` | 0.37513 |
| `judge_disagreement_share_v1` | 0.31786 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.45 |
| `v1_failure_share_by_check.date_correct` | 0.15 |
| `v1_failure_share_by_check.within_length` | 0.017857 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.053571 |
| `ci_width_at_60_items` | 0.23333 |
| `ci_width_at_full_set` | 0.12143 |

</details>
