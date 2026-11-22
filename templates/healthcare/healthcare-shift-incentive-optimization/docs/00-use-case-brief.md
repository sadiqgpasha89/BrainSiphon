# Healthcare Shift Incentive Optimization: use-case brief

> Generated from the blueprint `healthcare/healthcare-shift-incentive-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Shift Incentive Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. The system has to run as a scheduled batch job, inside these limits: Offers only from the approved incentive menu and within caps, Recommended incentives never create unequal pay for equal circumstances beyond policy and Randomised experimentation only with HR and legal approval and with a ceiling on exposure.

**Why it is hard.** The obvious approach is raw fill rate of shifts that received an incentive, and it fails because shifts that get incentives are the hardest ones and look worse. The second trap is in "Policy": the real signal is approved incentive menu and caps as hard constraints, while teams usually reach for a learned optimum with no limits.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way incentive spend per filled shift measures it.

**What success looks like.** Offline: Off-policy value of the recommended incentives, Fill-rate uplift with confidence interval and Cost per additional fill. Online: Fill rate of hard-to-staff shifts, Incentive spend per filled shift and Fairness gap across comparable groups. The launch is judged on "Fill rate of hard-to-staff shifts" while "Incentive spend per filled shift" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy.

**Training objective.** `\max_{a}\;\Pr(\text{fill}\mid s,a)\,V_s-\text{cost}(a)\quad\text{s.t.}\quad\sum_s \text{cost}(a_s)\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{a} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \Pr | Probability of the event written inside the brackets. |
| \text{fill} | Whether the shift is filled; Pr(fill \| s, a) is the probability that it is filled when incentive a is offered. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| s | Index over open shifts. |
| a | The incentive offered, chosen from the approved menu and caps. |
| V_s | The value to the organisation of filling shift s, for example the avoided premium or the avoided coverage gap. |
| \text{cost} | The expected spend of offering incentive a, counted only if the shift is filled. |
| \sum_s | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| B | The incentive budget for the period: total spend must stay at or below it. |

**Hard constraints**

- Offers only from the approved incentive menu and within caps
- Recommended incentives never create unequal pay for equal circumstances beyond policy
- Randomised experimentation only with HR and legal approval and with a ceiling on exposure
- Authorised workforce managers approve policy and individual offers
- Fairness impact is reported per role and unit
- Pseudonymous staff IDs and aggregate targeting by shift not by person

## The approach in one paragraph

Start with a fixed incentive ladder that rises as the shift approaches. Then earn the move to contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator, and only if it beats the baseline on Off-policy value of the recommended incentives and Fill-rate uplift with confidence interval after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Urgency | Hours to shift start and unmet required hours. Fill difficulty rises as notice shortens. Guard against: use time of the offer. |
| Add Historical response by shift type | Acceptance by role, shift and notice band. Describes how responsive the pool is. Guard against: strictly past offers. |
| Add Marginal fill probability | Estimated change in fill probability per incentive step. The quantity the decision needs. Guard against: estimate only from randomised or propensity-weighted data. |
| Run it as one pipeline | Open-shift and offer intake (scheduling extract), Incentive policy rules (approved menu and caps), Fill uplift model (contextual bandit), Budget-constrained allocator (constrained optimiser), Fairness check (group parity metrics), Workforce manager approval (human) and Offer log with propensities (lakehouse). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle budget exhausted mid-period | Pacing rule that spreads budget across the period with a reserve for critical shifts. |

**Deliberately not doing**

- Employee personal characteristics: unfair targeting and no causal signal.
- Raw acceptance rate: confounded by which shifts get which offers.
- Manager identity: proxies for habit rather than effect.

**How the approach is proven**

Prove it offline on Off-policy value of the recommended incentives, Fill-rate uplift with confidence interval and Cost per additional fill using time-ordered splits, then online on "Fill rate of hard-to-staff shifts" with "Incentive spend per filled shift" as the guardrail. Watch for: Treating raw acceptance as incentive effect, Ignoring offers that managers chose selectively and Optimising cost with no fairness check.

## Baseline and production design

- **Baseline (build this first):** A fixed incentive ladder that rises as the shift approaches.
- **Production design:** Contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator.

## Why AI, and why this kind

**Why AI.** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. The evidence that separates good from bad outcomes (Urgency, Historical response by shift type, Marginal fill probability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw fill rate of shifts that received an incentive" are what teams reach for first, and they fail because shifts that get incentives are the hardest ones and look worse. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Urgency, Historical response by shift type, Marginal fill probability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fixed incentive ladder that rises as the shift approaches | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fill rate of hard-to-staff shifts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating raw acceptance as incentive effect.
- Evaluation trap: Ignoring offers that managers chose selectively.
- Budget exhausted mid-period: later shifts get no incentive.
- Incentive anchoring: staff wait for bigger offers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
