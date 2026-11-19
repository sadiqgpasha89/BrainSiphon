# Dynamic Dispatch for Couriers & Gig Drivers: use-case brief

> Generated from the blueprint `supply-chain/dynamic-dispatch-for-ride-gig-couriers` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Dispatch for Couriers & Gig Drivers · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply. The system has to run in under 100 milliseconds, inside these limits: Decision every 2-5 seconds, Courier acceptance probability and Fairness of earnings.

**Why it is hard.** The obvious approach is greedy nearest courier, and it fails because greedy matches starve future orders. The second trap is in "Acceptance": the real signal is model acceptance probability in assignment, while teams usually reach for assuming couriers always accept.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $3.8K a month. A mistake is expensive in the way courier earnings per hour measures it.

**What success looks like.** Offline: Simulated average delivery time and courier idle time and Acceptance model calibration. Online: Delivery time P90 and Courier earnings per hour. The launch is judged on "Delivery time P90" while "Courier earnings per hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\left(-\text{wait}_t-\lambda\,\text{detour}_t+\mu\,\text{fairness}_t\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor. |
| \text{wait}_t | The customer's waiting time at step t. |
| \lambda | Weight on detour: how strongly it counts against the main objective. |
| \text{detour}_t | The extra distance the courier drives at step t. |
| \mu | Weight on fairness: how strongly it counts against the main objective. |
| \text{fairness}_t | A fairness measure, such as an even spread of jobs among couriers, at step t. |

**Hard constraints**

- Decision every 2-5 seconds
- Courier acceptance probability
- Fairness of earnings
- City-level scale

## The approach in one paragraph

Start with greedy nearest available courier. Then earn the move to batched bipartite matching with learned value function (approximate DP) and acceptance model, solved every few seconds per zone, and only if it beats the baseline on Simulated average delivery time and courier idle time and Acceptance model calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Courier acceptance probability | Model per courier-order pair. Match feasibility. Guard against: past offers. |
| Add Spatiotemporal supply-demand ratio | Couriers per order in cell-hour. Pricing and positioning. Guard against: forecast not actual. |
| Add Batch compatibility score | Detour added by batching. Efficiency. Guard against: route estimates. |
| Run it as one pipeline | Order stream (Kafka), Courier state (location service), Acceptance and ETA models (GBDT), Value-function estimator (ADP), Matching solver (min-cost flow), Offer service (courier app) and Outcome logs (analytics). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sudden rain increases orders and reduces couriers | Surge incentives and order throttling. |

**Deliberately not doing**

- Courier name: none.
- Order text: none.

**How the approach is proven**

Prove it offline on Simulated average delivery time and courier idle time and Acceptance model calibration using time-ordered splits, then online on "Delivery time P90" with "Courier earnings per hour" as the guardrail. Watch for: Simulators that assume independent couriers and Offline policy evaluation without propensities.

## Baseline and production design

- **Baseline (build this first):** Greedy nearest available courier.
- **Production design:** Batched bipartite matching with learned value function (approximate DP) and acceptance model, solved every few seconds per zone.

## Why AI, and why this kind

**Why AI.** Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply. The evidence that separates good from bad outcomes (Courier acceptance probability, Spatiotemporal supply-demand ratio, Batch compatibility score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "greedy nearest courier" are what teams reach for first, and they fail because greedy matches starve future orders. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Batched bipartite matching with learned value function (approximate DP) and acceptance model, solved every few seconds per zone.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Courier acceptance probability, Spatiotemporal supply-demand ratio, Batch compatibility score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Greedy nearest available courier | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Batched bipartite matching with learned value function (approximate DP) and acceptance model, solved every few seconds per zone | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delivery time P90) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulators that assume independent couriers.
- Evaluation trap: Offline policy evaluation without propensities.
- Sudden rain increases orders and reduces couriers: demand spikes while courier supply drops, so the dispatch queue explodes and waits balloon.
- GPS spoofing by couriers: false availability.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
