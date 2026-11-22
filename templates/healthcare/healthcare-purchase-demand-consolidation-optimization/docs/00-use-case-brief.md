# Healthcare Purchase Demand Consolidation Optimization: use-case brief

> Generated from the blueprint `healthcare/healthcare-purchase-demand-consolidation-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Purchase Demand Consolidation Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. The system has to run as a scheduled batch job, inside these limits: Buyers approve orders and critical supplies keep safety-stock constraints, Hard constraints cover supplier minimums, lead times, shelf life, storage and contract terms and The plan explains each constraint that binds.

**Why it is hard.** The obvious approach is unit price alone, and it fails because cheap bulk buys create expiry and holding cost. The second trap is in "Safety": the real signal is safety stock for critical items as hard constraints, while teams usually reach for cost-minimal stock.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way order count reduction measures it.

**What success looks like.** Offline: Total cost versus the best plan in hindsight, Stockout rate for critical items and Solver gap and time to feasible. Online: Tier savings achieved, Order count reduction and Critical-item service level. The launch is judged on "Tier savings achieved" while "Order count reduction" must not get worse.

## Objective, loss and constraints

**Business objective.** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies.

**Training objective.** `\min\;\sum_i \text{holding cost}_i+\text{order cost}_i+\text{stockout penalty}_i-\text{tier saving}_i`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{holding cost}_i | The cost of holding stock of item i over the plan, including capital and expiry waste. |
| \text{order cost}_i | The fixed cost of placing and receiving orders for item i. |
| \text{stockout penalty}_i | The penalty for expected shortfall of item i, weighted higher for critical supplies. |
| \text{tier saving}_i | The price saving for item i from reaching a contract volume tier. |

**Hard constraints**

- Buyers approve orders and critical supplies keep safety-stock constraints
- Hard constraints cover supplier minimums, lead times, shelf life, storage and contract terms
- The plan explains each constraint that binds
- Solver status, gap and fallback are reported
- Plans 90K item-facility pairs weekly
- Multi-echelon inventory logic covers central and local stores

## The approach in one paragraph

Start with each facility orders independently by reorder point. Then earn the move to a multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints, and only if it beats the baseline on Total cost versus the best plan in hindsight and Stockout rate for critical items after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Forecast demand with uncertainty | Expected demand and variance per item and facility. The basis of the plan. Guard against: forecast snapshot at planning time. |
| Add Tier proximity | Distance to the next price tier. Value of consolidation. Guard against: contract terms. |
| Add Lead-time variability | Variance of supplier lead time. Sets buffer. Guard against: receipts history. |
| Run it as one pipeline | Forecast and inventory intake (planning extracts), Constraint builder (contract and supply rules), Consolidation optimizer (MILP solver), Savings and risk evaluator (cost model), Buyer approval (human) and Order release (ERP), with Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier minimum cannot be met | Relax only soft costs and show the binding minimum. |

**Deliberately not doing**

- Buyer preference for a supplier: habit.
- Facility size alone: not demand.
- Past order timing: reflects past fragmentation.

**How the approach is proven**

Prove it offline on Total cost versus the best plan in hindsight, Stockout rate for critical items and Solver gap and time to feasible using time-ordered splits, then online on "Tier savings achieved" with "Order count reduction" as the guardrail. Watch for: Optimising price while ignoring holding cost, Dropping safety stock to hit a tier and Planning from a point forecast.

## Baseline and production design

- **Baseline (build this first):** Each facility orders independently by reorder point.
- **Production design:** A multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints.

## Why AI, and why this kind

**Why AI.** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. The evidence that separates good from bad outcomes (Forecast demand with uncertainty, Tier proximity, Lead-time variability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "unit price alone" are what teams reach for first, and they fail because cheap bulk buys create expiry and holding cost. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Forecast demand with uncertainty, Tier proximity, Lead-time variability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Each facility orders independently by reorder point | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tier savings achieved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising price while ignoring holding cost.
- Evaluation trap: Dropping safety stock to hit a tier.
- Supplier minimum cannot be met: no feasible consolidation.
- Demand surge: safety stock is too low.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
