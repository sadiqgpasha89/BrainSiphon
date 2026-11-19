# Feed Ad Load & Yield Optimisation: use-case brief

> Generated from the blueprint `adtech/feed-ad-load-and-yield-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feed Ad Load & Yield Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement. The system has to run in under 100 milliseconds, inside these limits: Long-term user health, Fairness to advertisers and Real-time decision per request.

**Why it is hard.** The obvious approach is immediate revenue, and it fails because more ads today means fewer sessions next month. The second trap is in "Joint": the real signal is joint organic and ad ranking, while teams usually reach for separate ads and organic ranking.

**Scale and stakes.** At 10 million users this is about 45.0M model-touching events a day, 521 requests per second on average and 3.1K at peak, at an estimated $17.5K a month. A mistake is expensive in the way session frequency measures it.

**What success looks like.** Offline: Surrogate-index prediction of long-term impact and Simulated slate value. Online: Long-term revenue per user and Session frequency. The launch is judged on "Long-term revenue per user" while "Session frequency" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(\text{ad revenue}_t+\lambda\,\text{engagement}_t)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for future rewards. |
| \text{ad revenue}_t | Revenue from ads at step t. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{engagement}_t | User engagement at step t, protected so ads do not erode it. |

**Hard constraints**

- Long-term user health
- Fairness to advertisers
- Real-time decision per request
- Experimentation with long holdouts

## The approach in one paragraph

Start with fixed ad every 5th item. Then earn the move to joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics, and only if it beats the baseline on Surrogate-index prediction of long-term impact and Simulated slate value after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around User ad tolerance | Historical engagement drop after ads. Load tuning. Guard against: experiments. |
| Add Predicted ad value | ECPM. Revenue. Guard against: calibration. |
| Add Organic item value | Predicted engagement of next organic item. Opportunity cost. Guard against: calibration. |
| Run it as one pipeline | Feed request (ranking service), Organic ranker (multi-task model), Ad ranker (eCPM model), Slate optimiser (constrained selection), Tolerance model (user-level), Feed response (client) and Long-term metric tracker (experiments). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle short-term gains from aggressive ad load | Long-term holdouts and surrogate indices. |

**Deliberately not doing**

- Ad ID: none.
- Slot ID: none.

**How the approach is proven**

Prove it offline on Surrogate-index prediction of long-term impact and Simulated slate value using time-ordered splits, then online on "Long-term revenue per user" with "Session frequency" as the guardrail. Watch for: A/B tests too short to see retention effects and Optimising impressions rather than value.

## Baseline and production design

- **Baseline (build this first):** Fixed ad every 5th item.
- **Production design:** Joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics.

## Why AI, and why this kind

**Why AI.** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement. The evidence that separates good from bad outcomes (User ad tolerance, Predicted ad value, Organic item value) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "immediate revenue" are what teams reach for first, and they fail because more ads today means fewer sessions next month. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among User ad tolerance, Predicted ad value, Organic item value and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed ad every 5th item | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics | chosen | Meets the 80 ms envelope at $0.013 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Long-term revenue per user) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A/B tests too short to see retention effects.
- Evaluation trap: Optimising impressions rather than value.
- Short-term gains from aggressive ad load: retention declines months later.
- Advertiser demand drop leaves slots unfilled: feed dominated by low-value ads.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
