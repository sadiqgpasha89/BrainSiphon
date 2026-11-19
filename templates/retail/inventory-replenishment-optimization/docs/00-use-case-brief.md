# Inventory Replenishment Optimisation: use-case brief

> Generated from the blueprint `retail/inventory-replenishment-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Inventory Replenishment Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost. The system has to run as a scheduled batch job, inside these limits: Supplier MOQ and lead times, Shelf-life limits and Warehouse capacity.

**Why it is hard.** The obvious approach is safety stock from a single sigma, and it fails because lead-time variability often dominates demand variability. The second trap is in "Policy": the real signal is parameterised (s, S) policies tuned by simulation, while teams usually reach for pure end-to-end deep RL.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inventory turns measures it.

**What success looks like.** Offline: Simulated cost at target service and Service-level attainment. Online: Fill rate and Inventory turns. The launch is judged on "Fill rate" while "Inventory turns" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost.

**Training objective.** `\min_\pi\;\mathbb{E}\!\left[\sum_t h\,I_t^+ + b\,I_t^-+ K\,\mathbb{1}_{q_t>0}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\pi | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| h | Holding cost per unit of leftover stock per period. |
| I_t^+ | Inventory at time t: I^+ is stock on hand and I^- is unmet demand (backorders). |
| b | Backorder (shortage) cost per unit. |
| K | The fixed cost of placing an order. |
| \mathbb{1}_{q_t>0} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. (one value per quantile level q and time step or token t) |

**Hard constraints**

- Supplier MOQ and lead times
- Shelf-life limits
- Warehouse capacity
- Service-level targets per class

## The approach in one paragraph

Start with reorder-point with safety stock from normal approximation. Then earn the move to simulation-optimised (s, S) policies with learned lead-time distributions and a multi-echelon allocation layer; RL used to tune parameters, and only if it beats the baseline on Simulated cost at target service and Service-level attainment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lead-time distribution | Empirical supplier lead-time quantiles. Safety stock driver. Guard against: use delivered, not promised, dates. |
| Add Demand forecast quantiles | 50th to 95th percentile over lead time. Reorder points. Guard against: forecast as-of order date. |
| Add Holding and stock-out cost ratio | Item-level critical ratio. Service target. Guard against: finance-approved costs. |
| Run it as one pipeline | Inventory and PO data (ERP extract), Lead-time model (distributional regression), Demand quantiles (forecasting service), Policy optimiser (simulation optimisation), Order generator (constraint solver), Buyer approval (planner workflow) and Service-level tracker (KPI). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier disruption | Disruption flags widen distributions and trigger alternate sourcing. |

**Deliberately not doing**

- Total yearly volume: already inside forecasts.
- Supplier name: encoded by lead-time distribution.

**How the approach is proven**

Prove it offline on Simulated cost at target service and Service-level attainment using time-ordered splits, then online on "Fill rate" with "Inventory turns" as the guardrail. Watch for: Simulation uses forecast with look-ahead and Costs not including expedite fees.

## Baseline and production design

- **Baseline (build this first):** Reorder-point with safety stock from normal approximation.
- **Production design:** Simulation-optimised (s, S) policies with learned lead-time distributions and a multi-echelon allocation layer; RL used to tune parameters.

## Why AI, and why this kind

**Why AI.** Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost. The evidence that separates good from bad outcomes (Lead-time distribution, Demand forecast quantiles, Holding and stock-out cost ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "safety stock from a single sigma" are what teams reach for first, and they fail because lead-time variability often dominates demand variability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Simulation-optimised (s, S) policies with learned lead-time distributions and a multi-echelon allocation layer; RL used to tune parameters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lead-time distribution, Demand forecast quantiles, Holding and stock-out cost ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reorder-point with safety stock from normal approximation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Simulation-optimised (s, S) policies with learned lead-time distributions and a multi-echelon allocation layer; RL used to tune parameters | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fill rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulation uses forecast with look-ahead.
- Evaluation trap: Costs not including expedite fees.
- Supplier disruption: lead times double.
- Forecast bias after promotion: post-promo demand dip is under-modelled, causing systematic over-ordering.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
