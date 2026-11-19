# Campaign Budget Pacing: use-case brief

> Generated from the blueprint `adtech/budget-pacing-controller` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Campaign Budget Pacing · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations. The system has to run in under 10 milliseconds, inside these limits: Overspend tolerance under 1%, Decision on every bid and Multi-campaign interactions.

**Why it is hard.** The obvious approach is fixed daily caps, and it fails because traffic is non-stationary and caps run out in the morning. The second trap is in "Quality": the real signal is pace toward high-value impressions, while teams usually reach for uniform throttling.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 11.1K at peak, at an estimated $5.4K a month. A mistake is expensive in the way overspend percentage measures it.

**What success looks like.** Offline: Spend-curve tracking error and Delivery vs budget. Online: Budget utilisation and Overspend percentage. The launch is judged on "Budget utilisation" while "Overspend percentage" must not get worse.

## Objective, loss and constraints

**Business objective.** Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations.

**Training objective.** `\min\;\sum_t\left(S_t-S^*_t\right)^2+\lambda\,\mathrm{ThrottleVariance}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| S_t | Spend so far at time t: S_t is the actual cumulative spend and S*_t the planned (target) cumulative spend. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ThrottleVariance} | Penalty on how erratically the controller throttles bidding up and down; large when the throttle rate jumps around. |

**Hard constraints**

- Overspend tolerance under 1%
- Decision on every bid
- Multi-campaign interactions
- Distributed counters

## The approach in one paragraph

Start with even throttling at a fixed probability. Then earn the move to pID-style pacing with traffic forecast feedforward and a quality-aware throttle that preferentially buys high-value impressions, and only if it beats the baseline on Spend-curve tracking error and Delivery vs budget after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spend error vs target curve | Actual minus ideal cumulative spend. Control signal. Guard against: distributed counters lag. |
| Add Traffic forecast | Expected requests per minute. Planning. Guard against: forecast quality. |
| Add Win-rate response | Change in win rate to bid multiplier. Controller gain. Guard against: estimated online. |
| Run it as one pipeline | Spend counters (Redis sharded), Traffic forecaster (lightweight model), Pacing controller (PID with feedforward), Throttle policy (probability and bid multiplier), Bid service (consumer), Billing reconciliation (batch) and Pacing metrics (monitoring). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle counter lag across data centres allows overspend | Conservative global limits and per-region reservations. |

**Deliberately not doing**

- Campaign name: none.
- Advertiser tenure: none.

**How the approach is proven**

Prove it offline on Spend-curve tracking error and Delivery vs budget using time-ordered splits, then online on "Budget utilisation" with "Overspend percentage" as the guardrail. Watch for: Testing controllers on smooth traffic only and Ignoring distributed counter delay.

## Baseline and production design

- **Baseline (build this first):** Even throttling at a fixed probability.
- **Production design:** PID-style pacing with traffic forecast feedforward and a quality-aware throttle that preferentially buys high-value impressions.

## Why AI, and why this kind

**Why AI.** Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations. The evidence that separates good from bad outcomes (Spend error vs target curve, Traffic forecast, Win-rate response) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed daily caps" are what teams reach for first, and they fail because traffic is non-stationary and caps run out in the morning. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: PID-style pacing with traffic forecast feedforward and a quality-aware throttle that preferentially buys high-value impressions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spend error vs target curve, Traffic forecast, Win-rate response and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Even throttling at a fixed probability | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| PID-style pacing with traffic forecast feedforward and a quality-aware throttle that preferentially buys high-value impressions | chosen | Meets the 8 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Budget utilisation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Testing controllers on smooth traffic only.
- Evaluation trap: Ignoring distributed counter delay.
- Counter lag across data centres allows overspend: the budget is exceeded in minutes.
- Traffic outage then recovery: controller overreacts and bursts spend.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
