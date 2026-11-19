# Order Promising (ATP/CTP) Optimisation: use-case brief

> Generated from the blueprint `supply-chain/order-promising-atp-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Promising (ATP/CTP) Optimisation · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility. The system has to run in under 100 milliseconds, inside these limits: Decision in 100 ms, Priority tiers and Allocation rules.

**Why it is hard.** The obvious approach is first-come-first-served, and it fails because fCFS gives scarce stock to low-value orders. The second trap is in "Feasibility": the real signal is capable-to-promise includes production and transport capacity, while teams usually reach for stock-only ATP.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.8K a month. A mistake is expensive in the way revenue from priority orders measures it.

**What success looks like.** Offline: Simulated revenue and service level and Promise accuracy. Online: On-time-in-full rate and Revenue from priority orders. The launch is judged on "On-time-in-full rate" while "Revenue from priority orders" must not get worse.

## Objective, loss and constraints

**Business objective.** Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility.

**Training objective.** `\max\;\sum_o v_o\,\mathbb{1}[\text{promise}_o]\ \text{s.t. inventory and capacity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_o | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| v_o | The value of promising order o. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{promise}_o | Whether order o is promised (1) or not (0). |

**Hard constraints**

- Decision in 100 ms
- Priority tiers
- Allocation rules
- Partial fulfilment policy

## The approach in one paragraph

Start with rule-based ATP checks on available stock. Then earn the move to optimisation-based promising with demand-aware reservation levels and fast heuristic for real-time orders, and only if it beats the baseline on Simulated revenue and service level and Promise accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Available-to-promise by node | Stock net of reservations. Feasibility. Guard against: real-time. |
| Add Customer value tier | Value and priority. Allocation. Guard against: cRM. |
| Add Expected demand for scarce items | Forecast demand. Reservation. Guard against: forecast. |
| Run it as one pipeline | Order request (OMS), ATP service (inventory view), Reservation optimiser (MIP), Promise calculator (lead-time model), Allocation executor (stock reservation), Customer service (human override) and Fulfilment outcomes (tracking). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle inventory accuracy issues | Inventory confidence buffers. |

**Deliberately not doing**

- Order ID: none.
- Customer name: none.

**How the approach is proven**

Prove it offline on Simulated revenue and service level and Promise accuracy using time-ordered splits, then online on "On-time-in-full rate" with "Revenue from priority orders" as the guardrail. Watch for: Simulations without demand uncertainty and Counting promises not fulfilled.

## Baseline and production design

- **Baseline (build this first):** Rule-based ATP checks on available stock.
- **Production design:** Optimisation-based promising with demand-aware reservation levels and fast heuristic for real-time orders.

## Why AI, and why this kind

**Why AI.** Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility. The evidence that separates good from bad outcomes (Available-to-promise by node, Customer value tier, Expected demand for scarce items) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "first-come-first-served" are what teams reach for first, and they fail because FCFS gives scarce stock to low-value orders. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Optimisation-based promising with demand-aware reservation levels and fast heuristic for real-time orders.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Available-to-promise by node, Customer value tier, Expected demand for scarce items and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based ATP checks on available stock | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Optimisation-based promising with demand-aware reservation levels and fast heuristic for real-time orders | chosen | Meets the 80 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-time-in-full rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulations without demand uncertainty.
- Evaluation trap: Counting promises not fulfilled.
- Inventory accuracy issues: promises broken.
- Concurrent orders for the last units: race conditions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
