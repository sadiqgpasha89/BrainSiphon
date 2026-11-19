# Loyalty Programme Offer Optimisation: use-case brief

> Generated from the blueprint `retail/loyalty-offer-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loyalty Programme Offer Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget. The system has to run as a scheduled batch job, inside these limits: Programme liability accounting, Fairness across tiers and Offer expiry rules.

**Why it is hard.** The obvious approach is redemption rate, and it fails because redeemers were mostly going to buy anyway. The second trap is in "Long horizon": the real signal is customer lifetime value in the reward objective, while teams usually reach for one-purchase ROI.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way active member retention measures it.

**What success looks like.** Offline: Off-policy value (FQE) and Incremental spend in holdout. Online: Incremental margin per programme dollar and Active member retention. The launch is judged on "Incremental margin per programme dollar" while "Active member retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{margin}_t-\text{cost}_t)\right]\ \text{s.t. cost}\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor. |
| \text{margin}_t | Profit margin earned at step t. |
| \text{cost}_t | The cost of the offer at step t. |
| B | The loyalty budget: total offer cost must stay below it. |

**Hard constraints**

- Programme liability accounting
- Fairness across tiers
- Offer expiry rules
- Weekly cadence

## The approach in one paragraph

Start with rules by tier and last purchase date. Then earn the move to offline-RL with conservative Q-learning on logged offers, with randomised exploration cohort and budget-constrained allocation, and only if it beats the baseline on Off-policy value (FQE) and Incremental spend in holdout after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Reward elasticity | Spend response to reward intensity. Optimisation input. Guard against: randomised test cells. |
| Add Tier proximity | Gap to next tier threshold. Motivation. Guard against: rolling spend as-of. |
| Add Breakage propensity | Probability points expire unused. Liability. Guard against: historic expiry rates. |
| Run it as one pipeline | Member 360 (lakehouse), Elasticity and LTV models (GBDT), Offer policy (conservative offline RL), Budget allocator (constrained solver), Offer publisher (CRM) and Redemption tracking (POS), with Programme finance review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle points liability spikes | Liability cap with real-time accrual monitor. |

**Deliberately not doing**

- Number of offers received: exposure artefact.
- Email domain: unrelated.

**How the approach is proven**

Prove it offline on Off-policy value (FQE) and Incremental spend in holdout using time-ordered splits, then online on "Incremental margin per programme dollar" with "Active member retention" as the guardrail. Watch for: Logged data lacks randomisation and Measuring redemption not lift.

## Baseline and production design

- **Baseline (build this first):** Rules by tier and last purchase date.
- **Production design:** Offline-RL with conservative Q-learning on logged offers, with randomised exploration cohort and budget-constrained allocation.

## Why AI, and why this kind

**Why AI.** Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget. The evidence that separates good from bad outcomes (Reward elasticity, Tier proximity, Breakage propensity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "redemption rate" are what teams reach for first, and they fail because redeemers were mostly going to buy anyway. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Offline-RL with conservative Q-learning on logged offers, with randomised exploration cohort and budget-constrained allocation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Reward elasticity, Tier proximity, Breakage propensity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules by tier and last purchase date | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Offline-RL with conservative Q-learning on logged offers, with randomised exploration cohort and budget-constrained allocation | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental margin per programme dollar) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Logged data lacks randomisation.
- Evaluation trap: Measuring redemption not lift.
- Points liability spikes: unexpected finance exposure.
- Offer eligibility conflicts across brands: the optimiser issues offers that the brand rules make invalid at redemption.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
