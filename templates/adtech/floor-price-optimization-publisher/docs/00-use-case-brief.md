# Publisher Floor-Price Optimisation: use-case brief

> Generated from the blueprint `adtech/floor-price-optimization-publisher` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Publisher Floor-Price Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away. The system has to run in under 100 milliseconds, inside these limits: Latency 30 ms, Buyer fairness and Header-bidding complexity.

**Why it is hard.** The obvious approach is optimise single-auction revenue, and it fails because buyers learn and lower bids if floors rise. The second trap is in "Evaluation": the real signal is randomised floor experiments, while teams usually reach for counterfactual from logs.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $4.7K a month. A mistake is expensive in the way fill rate measures it.

**What success looks like.** Offline: Simulated revenue under logged-bid distributions and Calibration of top-bid quantiles. Online: Revenue per thousand impressions and Fill rate. The launch is judged on "Revenue per thousand impressions" while "Fill rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away.

**Training objective.** `\max_{f}\;\mathbb{E}\!\left[\max(\text{bid}_{(1)},\text{bid}_{(2)},f)\cdot\mathbb{1}[\text{bid}_{(1)}\ge f]\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{f} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{bid}_{(1)} | The bids received: bid_(1) is the highest and bid_(2) the second-highest. |
| f | The floor price: the minimum price the publisher accepts, the thing being optimised. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |

**Hard constraints**

- Latency 30 ms
- Buyer fairness
- Header-bidding complexity
- Avoid long-term demand loss

## The approach in one paragraph

Start with static floors by placement. Then earn the move to distributional top-bid model with contextual bandit floor selection and a long-term demand guardrail, and only if it beats the baseline on Simulated revenue under logged-bid distributions and Calibration of top-bid quantiles after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted top-bid distribution | Quantiles of the highest bid. Floor candidates. Guard against: censored by earlier floors. |
| Add Placement and context value | Page type and position. Value. Guard against: context. |
| Add Buyer demand elasticity | Bids' response to floor change. Long run. Guard against: experiments. |
| Run it as one pipeline | Ad request (SSP), Context features (cache), Top-bid distribution model (quantile GBDT), Floor optimiser (bandit), Auction execution (SSP), Revenue logs (stream) and Buyer response monitor (analytics). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle demand partners reduce bids after repeated high floors | Long-horizon holdouts and elasticity monitoring. |

**Deliberately not doing**

- Impression ID: none.
- Page title: text noise.

**How the approach is proven**

Prove it offline on Simulated revenue under logged-bid distributions and Calibration of top-bid quantiles using time-ordered splits, then online on "Revenue per thousand impressions" with "Fill rate" as the guardrail. Watch for: Counterfactual revenue using bids from different floors and Ignoring bidder adaptation.

## Baseline and production design

- **Baseline (build this first):** Static floors by placement.
- **Production design:** Distributional top-bid model with contextual bandit floor selection and a long-term demand guardrail.

## Why AI, and why this kind

**Why AI.** Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away. The evidence that separates good from bad outcomes (Predicted top-bid distribution, Placement and context value, Buyer demand elasticity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "optimise single-auction revenue" are what teams reach for first, and they fail because buyers learn and lower bids if floors rise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Distributional top-bid model with contextual bandit floor selection and a long-term demand guardrail.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted top-bid distribution, Placement and context value, Buyer demand elasticity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static floors by placement | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Distributional top-bid model with contextual bandit floor selection and a long-term demand guardrail | chosen | Meets the 80 ms envelope at $0.0018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per thousand impressions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counterfactual revenue using bids from different floors.
- Evaluation trap: Ignoring bidder adaptation.
- Demand partners reduce bids after repeated high floors: yield declines after initial gains.
- Floor too high causes unsold inventory: fill rate collapses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
