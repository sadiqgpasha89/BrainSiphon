# Cross-Border Payment FX & Fee Pricing: use-case brief

> Generated from the blueprint `fintech/cross-border-fx-pricing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Border Payment FX & Fee Pricing · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints. The system has to run in under 100 milliseconds, inside these limits: Price transparency regulations, No discriminatory pricing and Live FX rate volatility.

**Why it is hard.** The obvious approach is correlating price with conversion, and it fails because price correlates with segment quality. The second trap is in "Cost": the real signal is live cost of liquidity (spread, hedging) in the margin, while teams usually reach for fixed markup.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way conversion rate measures it.

**What success looks like.** Offline: Revenue lift in randomised price tests and Elasticity calibration. Online: Revenue per transaction and Conversion rate. The launch is judged on "Revenue per transaction" while "Conversion rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints.

**Training objective.** `\max_p\;\mathbb{E}\!\left[(p-c)\cdot\Pr(\text{convert}\mid p,x)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_p | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| p | The price (FX margin) offered to the customer. |
| c | The cost to the bank of providing the transaction. |
| \Pr | Probability of the event written inside the brackets. |
| \text{convert} | Whether the customer accepts the price and completes the transfer; its probability depends on price p and context x. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Price transparency regulations
- No discriminatory pricing
- Live FX rate volatility
- Quote validity window of 30 s

## The approach in one paragraph

Start with tiered fixed markups per corridor. Then earn the move to bayesian demand model with Thompson-sampling price experimentation and a convex optimiser with fairness guardrails, and only if it beats the baseline on Revenue lift in randomised price tests and Elasticity calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Corridor price elasticity | Log-log demand response from randomised price tests. Optimisation input. Guard against: use randomised cells only. |
| Add Quote-to-convert funnel | Conversion by price band for similar customers. Demand curve. Guard against: condition on amount and device. |
| Add Liquidity cost estimate | Real-time spread plus hedge cost. Cost term. Guard against: use cost at quote time. |
| Run it as one pipeline | Quote request (API), Cost estimator (live liquidity feed), Demand model (Bayesian elasticity), Price optimiser (constrained solver), Fairness guard (policy limits), Quote service (response) and Conversion events (Kafka). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle volatility spike | Dynamic margin floor tied to realised volatility. |

**Deliberately not doing**

- Customer nationality: fairness risk, replaced by corridor.
- Session duration: funnel artefact.

**How the approach is proven**

Prove it offline on Revenue lift in randomised price tests and Elasticity calibration using time-ordered splits, then online on "Revenue per transaction" with "Conversion rate" as the guardrail. Watch for: Observational price-conversion data confounded and Optimising on quotes not completed transfers.

## Baseline and production design

- **Baseline (build this first):** Tiered fixed markups per corridor.
- **Production design:** Bayesian demand model with Thompson-sampling price experimentation and a convex optimiser with fairness guardrails.

## Why AI, and why this kind

**Why AI.** Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints. The evidence that separates good from bad outcomes (Corridor price elasticity, Quote-to-convert funnel, Liquidity cost estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "correlating price with conversion" are what teams reach for first, and they fail because price correlates with segment quality. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Bayesian demand model with Thompson-sampling price experimentation and a convex optimiser with fairness guardrails.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Corridor price elasticity, Quote-to-convert funnel, Liquidity cost estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Tiered fixed markups per corridor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian demand model with Thompson-sampling price experimentation and a convex optimiser with fairness guardrails | chosen | Meets the 80 ms envelope at $0.133 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per transaction) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational price-conversion data confounded.
- Evaluation trap: Optimising on quotes not completed transfers.
- Volatility spike: quotes become loss-making.
- Regulatory transparency rule: prices must be shown in fixed format.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
