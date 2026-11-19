# Warehouse Slotting Optimisation: use-case brief

> Generated from the blueprint `supply-chain/warehouse-slotting-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Slotting Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns. The system has to run as a scheduled batch job, inside these limits: Heavy items low, Hazmat segregation and Re-slotting labour cost.

**Why it is hard.** The obvious approach is velocity-only ABC classes, and it fails because items picked together should be near each other. The second trap is in "Cost": the real signal is include re-slotting labour in the optimisation, while teams usually reach for reshuffling the whole warehouse weekly.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way travel distance per order measures it.

**What success looks like.** Offline: Simulated travel distance reduction and Pick-time estimate accuracy. Online: Lines picked per labour hour and Travel distance per order. The launch is judged on "Lines picked per labour hour" while "Travel distance per order" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns.

**Training objective.** `\min_{x}\;\sum_{s}\sum_{l}f_s\,d_l\,x_{sl}+\lambda\sum_{(s,s')}a_{ss'}\,\mathrm{dist}(x_s,x_{s'})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{x} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{s} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| f_s | How often SKU s is picked. |
| d_l | The distance of location l from the dispatch point. |
| x_{sl} | Decision: x_{sl} is 1 if SKU s is placed in location l. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| a_{ss'} | How often SKUs s and s' are ordered together. |
| \mathrm{dist} | The distance between the locations of two SKUs. |

**Hard constraints**

- Heavy items low
- Hazmat segregation
- Re-slotting labour cost
- Weekly cadence

## The approach in one paragraph

Start with aBC slotting by velocity. Then earn the move to mILP with affinity and move-cost terms on a pick-time simulator, solved weekly with incremental re-slotting waves, and only if it beats the baseline on Simulated travel distance reduction and Pick-time estimate accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pick frequency forecast | Expected picks per SKU next 4 weeks. Fast movers near docks. Guard against: forecast as-of. |
| Add Co-pick affinity matrix | Lift of SKU pairs in orders. Travel reduction. Guard against: matured orders. |
| Add Cube and weight attributes | Handling constraints. Feasibility. Guard against: master data. |
| Run it as one pipeline | Order lines and pick logs (WMS), Demand and affinity features (Spark), Slotting optimiser (MILP), Move planner (wave scheduler), Simulator check (discrete-event sim), Supervisor approval (human) and Productivity tracking (KPI). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal assortment changes | Seasonal triggers and rolling re-slot windows. |

**Deliberately not doing**

- SKU description: none.
- Supplier: none.

**How the approach is proven**

Prove it offline on Simulated travel distance reduction and Pick-time estimate accuracy using time-ordered splits, then online on "Lines picked per labour hour" with "Travel distance per order" as the guardrail. Watch for: Travel savings ignoring congestion and Using current slots to infer demand.

## Baseline and production design

- **Baseline (build this first):** ABC slotting by velocity.
- **Production design:** MILP with affinity and move-cost terms on a pick-time simulator, solved weekly with incremental re-slotting waves.

## Why AI, and why this kind

**Why AI.** Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns. The evidence that separates good from bad outcomes (Pick frequency forecast, Co-pick affinity matrix, Cube and weight attributes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "velocity-only ABC classes" are what teams reach for first, and they fail because items picked together should be near each other. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: MILP with affinity and move-cost terms on a pick-time simulator, solved weekly with incremental re-slotting waves.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pick frequency forecast, Co-pick affinity matrix, Cube and weight attributes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: ABC slotting by velocity | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| MILP with affinity and move-cost terms on a pick-time simulator, solved weekly with incremental re-slotting waves | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lines picked per labour hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Travel savings ignoring congestion.
- Evaluation trap: Using current slots to infer demand.
- Seasonal assortment changes: slotting stale within weeks.
- Master data errors in dimensions: infeasible assignments.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
