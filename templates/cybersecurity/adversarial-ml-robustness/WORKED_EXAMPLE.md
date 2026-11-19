# Adversarial Robustness for Deployed Models: worked example

> Run on synthetic data with `generative` engine, seed 54802, knobs {"n": 235}, in 0.6 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks.

**Constraints that shape the design.** Utility-robustness trade-off; Realistic threat models; Feature-space constraints

**Label in this use case.** For "Adversarial Robustness for Deployed Models": Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Non-adaptive attacks only.

## 2. Choose the signals

Your strongest signal is **Robust accuracy under constrained attack** (accuracy under domain attack). Its rule: Attack realism. In the starter, the closest executable idea is **key facts**: the entity, amount and date every output must contain. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The same outputs pass 15.3% under the strict judge and 50.6% under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa 0.30).

## 4. Baseline against the stronger design

Version 2 passes 60.0% against 50.6%: a difference of 9.4% with a 95% interval of 1.7% to 18.3%. With only 60 items the interval on one pass rate is 0.25 wide, against 0.12 on the full set.

| Result | Value |
|---|---|
| Pass rate v1, strict judge | 15.3% |
| Pass rate v1, fuzzy judge | 50.6% |
| Pass rate v2, fuzzy judge | 60.0% |
| v2 minus v1, 95% interval | 9.4% (1.7% to 18.3%) |
| Judge agreement (kappa) | 0.30 |

## 5. An edge case from the blueprint

**Attacker adapts to the deployed defence.** robustness estimates are stale. Planned response: Periodic adaptive red-teaming and bug-bounty feedback. Write the test that replays this case through your pipeline before you tune anything.

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
| `golden_items` | 235 |
| `v1_pass_rate_strict_judge` | 0.15319 |
| `v1_pass_rate_fuzzy_judge` | 0.50638 |
| `v2_pass_rate_fuzzy_judge` | 0.6 |
| `v1_pass_rate_ci95` | 0.4426, 0.5617 |
| `v2_minus_v1` | 0.093617 |
| `v2_minus_v1_ci95` | 0.01681, 0.183 |
| `judge_agreement_kappa_v1` | 0.29982 |
| `judge_disagreement_share_v1` | 0.35319 |
| `v1_failure_share_by_check.has_entity` | 0 |
| `v1_failure_share_by_check.amount_correct` | 0.44681 |
| `v1_failure_share_by_check.date_correct` | 0.10638 |
| `v1_failure_share_by_check.within_length` | 0.025532 |
| `v1_failure_share_by_check.no_forbidden_claims` | 0.059574 |
| `ci_width_at_60_items` | 0.25 |
| `ci_width_at_full_set` | 0.11915 |

</details>
