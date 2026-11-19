# Pricing & Packaging Optimisation: use-case brief

> Generated from the blueprint `saas/pricing-and-packaging-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pricing & Packaging Optimisation · **Domain:** saas · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction. The system has to run as a scheduled batch job, inside these limits: Price changes affect existing customers, Fairness and legal and Limited experiments.

**Why it is hard.** The obvious approach is correlation of price and conversion, and it fails because discounts target different customers than list prices. The second trap is in "Value": the real signal is value-metric alignment (seats, usage, outcomes), while teams usually reach for raw price tiers.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way conversion at new prices measures it.

**What success looks like.** Offline: Backtested revenue under counterfactual prices and Choice model calibration. Online: Net revenue retention after change and Conversion at new prices. The launch is judged on "Net revenue retention after change" while "Conversion at new prices" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction.

**Training objective.** `\max_{p}\;\sum_s \Pr(\text{buy}\mid p,x_s)\,(p-c)\quad\text{(segment-level choice model)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{p} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_s | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \Pr | Probability of the event written inside the brackets. |
| \text{buy} | Whether a customer in segment s buys at price p. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| p | The price chosen, the thing being optimised. |
| x_s | Segment features: x_s for segment s. |
| c | The unit cost of serving a customer. |

**Hard constraints**

- Price changes affect existing customers
- Fairness and legal
- Limited experiments
- Long sales cycles

## The approach in one paragraph

Start with competitor-based and cost-plus pricing. Then earn the move to hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations, and only if it beats the baseline on Backtested revenue under counterfactual prices and Choice model calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Feature usage by plan | Usage of gated features. Value drivers. Guard against: telemetry. |
| Add Willingness-to-pay estimate | Conjoint or Van Westendorp. Price anchor. Guard against: survey bias. |
| Add Price elasticity by segment | Randomised test response. Optimisation input. Guard against: test design. |
| Run it as one pipeline | Deal and usage data (warehouse), Conjoint and test results (research), Choice model (Bayesian), Price optimiser (constrained search), Cannibalisation simulator (scenario analysis), Pricing committee (human) and Rollout metrics (monitoring). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle legacy customers perceive an unfair increase | Grandfathering and phased migration with comms. |

**Deliberately not doing**

- Rep discount rates: negotiation noise.
- Competitor list price only: ignores bundles.

**How the approach is proven**

Prove it offline on Backtested revenue under counterfactual prices and Choice model calibration using time-ordered splits, then online on "Net revenue retention after change" with "Conversion at new prices" as the guardrail. Watch for: Observational prices confounded by deal size and Ignoring cannibalisation.

## Baseline and production design

- **Baseline (build this first):** Competitor-based and cost-plus pricing.
- **Production design:** Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations.

## Why AI, and why this kind

**Why AI.** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction. The evidence that separates good from bad outcomes (Feature usage by plan, Willingness-to-pay estimate, Price elasticity by segment) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "correlation of price and conversion" are what teams reach for first, and they fail because discounts target different customers than list prices. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Feature usage by plan, Willingness-to-pay estimate, Price elasticity by segment and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Competitor-based and cost-plus pricing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Net revenue retention after change) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational prices confounded by deal size.
- Evaluation trap: Ignoring cannibalisation.
- Legacy customers perceive an unfair increase: existing customers see a price rise as unfair and churn spikes in the migrated cohort.
- Competitor launches a cheaper plan: demand shifts quickly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
