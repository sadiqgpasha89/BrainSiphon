# Order Routing & Fulfilment Node Selection: use-case brief

> Generated from the blueprint `retail/order-routing-fulfilment-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Routing & Fulfilment Node Selection · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand. The system has to run in under 100 milliseconds, inside these limits: Decision in 50 ms, Split-shipment limits and Store pick capacity.

**Why it is hard.** The obvious approach is cheapest shipping only, and it fails because using scarce stock now causes later stock-outs. The second trap is in "Accuracy": the real signal is inventory confidence-weighted availability, while teams usually reach for treating system stock as truth.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way on-time delivery rate measures it.

**What success looks like.** Offline: Simulated total cost-to-serve and Cancellation rate prediction. Online: Cost per order and On-time delivery rate. The launch is judged on "Cost per order" while "On-time delivery rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand.

**Training objective.** `\min_a\;\text{ship cost}(a)+\lambda\,\text{delay}(a)+\mu\,\text{opportunity cost of stock}(a)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_a | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \text{ship cost} | The cost of shipping from option a. |
| a | The fulfilment option chosen, such as which warehouse or store ships the order. |
| \lambda | Weight on delay: how strongly it counts against the main objective. |
| \text{delay} | The expected delivery delay of option a. |
| \mu | Weight on stock opportunity cost: how strongly it counts against the main objective. |
| \text{opportunity cost of stock} | The value of the stock if it were kept for other orders instead. |

**Hard constraints**

- Decision in 50 ms
- Split-shipment limits
- Store pick capacity
- Real-time inventory accuracy

## The approach in one paragraph

Start with nearest node with stock. Then earn the move to cost-to-serve optimiser (MIP) with learned stock opportunity values and cancellation-risk model, solved per order in milliseconds, and only if it beats the baseline on Simulated total cost-to-serve and Cancellation rate prediction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Node inventory confidence | Probability the item is truly available. Cancellation risk. Guard against: cycle-count based. |
| Add Shipping cost and zone | Carrier rate to destination zone. Cost term. Guard against: rate table as-of. |
| Add Node pick capacity utilisation | Orders pending vs capacity. Delay risk. Guard against: real-time. |
| Run it as one pipeline | Order event (order service), Inventory view (confidence service), Cost and capacity lookup (rate tables), Node selector (MIP solver), Opportunity-cost model (value function), Fulfilment instruction (WMS) and Outcome tracking (delays and cancels). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle phantom inventory at store | Confidence scores and verification pick policy. |

**Deliberately not doing**

- Order ID parity: none.
- Customer name: none.

**How the approach is proven**

Prove it offline on Simulated total cost-to-serve and Cancellation rate prediction using time-ordered splits, then online on "Cost per order" with "On-time delivery rate" as the guardrail. Watch for: Simulator uses perfect inventory and Ignoring split-shipment customer experience.

## Baseline and production design

- **Baseline (build this first):** Nearest node with stock.
- **Production design:** Cost-to-serve optimiser (MIP) with learned stock opportunity values and cancellation-risk model, solved per order in milliseconds.

## Why AI, and why this kind

**Why AI.** Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand. The evidence that separates good from bad outcomes (Node inventory confidence, Shipping cost and zone, Node pick capacity utilisation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "cheapest shipping only" are what teams reach for first, and they fail because using scarce stock now causes later stock-outs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Cost-to-serve optimiser (MIP) with learned stock opportunity values and cancellation-risk model, solved per order in milliseconds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Node inventory confidence, Shipping cost and zone, Node pick capacity utilisation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Nearest node with stock | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Cost-to-serve optimiser (MIP) with learned stock opportunity values and cancellation-risk model, solved per order in milliseconds | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per order) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulator uses perfect inventory.
- Evaluation trap: Ignoring split-shipment customer experience.
- Phantom inventory at store: cancel and re-route.
- Peak promotion: capacity exceeded at best nodes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
