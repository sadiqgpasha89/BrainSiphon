# Delivery Time-Slot Pricing & Allocation: use-case brief

> Generated from the blueprint `supply-chain/delivery-time-slot-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Delivery Time-Slot Pricing & Allocation · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion. The system has to run in under 100 milliseconds, inside these limits: Capacity per slot, Fairness in pricing and 50 ms.

**Why it is hard.** The obvious approach is flat slot pricing, and it fails because cost depends on where the existing route is. The second trap is in "Choice": the real signal is customer slot-choice model, while teams usually reach for assuming a single preferred slot.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way conversion rate measures it.

**What success looks like.** Offline: Simulated margin and utilisation and Choice model log-loss. Online: Route cost per delivery and Conversion rate. The launch is judged on "Route cost per delivery" while "Conversion rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion.

**Training objective.** `\max_{p}\;\mathbb{E}\!\left[\text{conv}(p)\cdot(\text{margin}-\text{cost}(\text{slot}))\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{p} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{conv} | The probability the customer completes the purchase given the slots and prices shown. |
| p | The slot price or offer shown to the customer. |
| \text{margin} | The margin earned on the order. |
| \text{cost} | The delivery cost of the chosen slot. |
| \text{slot} | A delivery time slot. |

**Hard constraints**

- Capacity per slot
- Fairness in pricing
- 50 ms
- Customer experience

## The approach in one paragraph

Start with fixed slot prices by time of day. Then earn the move to dynamic slot-pricing policy using a multinomial choice model and route-insertion cost estimator, with caps to keep prices predictable, and only if it beats the baseline on Simulated margin and utilisation and Choice model log-loss after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Marginal insertion cost | Extra route time of the new stop. Slot cost. Guard against: routes as-of. |
| Add Slot capacity remaining | Slots left per window. Scarcity. Guard against: real-time. |
| Add Customer slot-choice propensity | Choice model probability. Demand. Guard against: history. |
| Run it as one pipeline | Checkout request (API), Insertion-cost estimator (routing engine), Choice model (MNL), Slot pricer (optimiser), Slot display (UI), Booking service (capacity DB) and Outcome logs (analytics). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle cost estimates stale as routes change | Short cache TTL and cost refresh triggers. |

**Deliberately not doing**

- Customer name: none.
- Basket ID: none.

**How the approach is proven**

Prove it offline on Simulated margin and utilisation and Choice model log-loss using time-ordered splits, then online on "Route cost per delivery" with "Conversion rate" as the guardrail. Watch for: Simulation uses fixed demand regardless of price and Ignoring cannibalisation across slots.

## Baseline and production design

- **Baseline (build this first):** Fixed slot prices by time of day.
- **Production design:** Dynamic slot-pricing policy using a multinomial choice model and route-insertion cost estimator, with caps to keep prices predictable.

## Why AI, and why this kind

**Why AI.** Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion. The evidence that separates good from bad outcomes (Marginal insertion cost, Slot capacity remaining, Customer slot-choice propensity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "flat slot pricing" are what teams reach for first, and they fail because cost depends on where the existing route is. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Dynamic slot-pricing policy using a multinomial choice model and route-insertion cost estimator, with caps to keep prices predictable.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Marginal insertion cost, Slot capacity remaining, Customer slot-choice propensity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed slot prices by time of day | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dynamic slot-pricing policy using a multinomial choice model and route-insertion cost estimator, with caps to keep prices predictable | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Route cost per delivery) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulation uses fixed demand regardless of price.
- Evaluation trap: Ignoring cannibalisation across slots.
- Cost estimates stale as routes change: slots mispriced.
- Price perception complaints: fluctuating slot prices are perceived as unfair and damage trust in the brand.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
