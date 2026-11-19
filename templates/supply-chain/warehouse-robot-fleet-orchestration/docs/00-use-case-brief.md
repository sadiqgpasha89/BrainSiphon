# Warehouse Robot Fleet Orchestration: use-case brief

> Generated from the blueprint `supply-chain/warehouse-robot-fleet-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Robot Fleet Orchestration · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput. The system has to run in under 100 milliseconds, inside these limits: Safety-critical collision avoidance, Plan updates under 100 ms and Battery management.

**Why it is hard.** The obvious approach is end-to-end learned control, and it fails because learned policies without guarantees can collide. The second trap is in "Scale": the real signal is hierarchical task assignment and local planning, while teams usually reach for centralised joint planning.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.0K a month. A mistake is expensive in the way robot utilisation measures it.

**What success looks like.** Offline: Throughput in simulation and Collision and deadlock count. Online: Orders per hour and Robot utilisation. The launch is judged on "Orders per hour" while "Robot utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \text{throughput}_t-\lambda\,\text{conflicts}_t\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{throughput}_t | Tasks completed at step t. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{conflicts}_t | Collisions or deadlocks between robots at step t. |

**Hard constraints**

- Safety-critical collision avoidance
- Plan updates under 100 ms
- Battery management
- Traffic deadlocks must be impossible

## The approach in one paragraph

Start with rule-based traffic management with reservation tables. Then earn the move to hierarchical system: learned task allocator (graph RL), conflict-based search path planner and a safety shield enforcing hard constraints, and only if it beats the baseline on Throughput in simulation and Collision and deadlock count after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Task-robot assignment cost | Travel plus battery cost. Task allocation. Guard against: map state. |
| Add Congestion heatmap | Robot density per cell. Rerouting. Guard against: short windows. |
| Add Battery state-of-charge forecast | Time to charge. Availability. Guard against: battery model. |
| Run it as one pipeline | Task allocator (RL policy), Path planner (CBS with learned priorities), Safety shield (verified rules), Robot control (edge controllers), Operations monitoring (dashboard) and Telemetry (analytics), with Order and task queue off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle wireless network drop | Local safe-stop behaviour and degraded autonomy. |

**Deliberately not doing**

- Robot serial number: none.
- Task creator: none.

**How the approach is proven**

Prove it offline on Throughput in simulation and Collision and deadlock count using time-ordered splits, then online on "Orders per hour" with "Robot utilisation" as the guardrail. Watch for: Training in empty warehouses and Ignoring human workers in the environment.

## Baseline and production design

- **Baseline (build this first):** Rule-based traffic management with reservation tables.
- **Production design:** Hierarchical system: learned task allocator (graph RL), conflict-based search path planner and a safety shield enforcing hard constraints.

## Why AI, and why this kind

**Why AI.** Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput. The evidence that separates good from bad outcomes (Task-robot assignment cost, Congestion heatmap, Battery state-of-charge forecast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "end-to-end learned control" are what teams reach for first, and they fail because learned policies without guarantees can collide. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Hierarchical system: learned task allocator (graph RL), conflict-based search path planner and a safety shield enforcing hard constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Task-robot assignment cost, Congestion heatmap, Battery state-of-charge forecast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based traffic management with reservation tables | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical system: learned task allocator (graph RL), conflict-based search path planner and a safety shield enforcing hard constraints | chosen | Meets the 80 ms envelope at $0.0088 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Orders per hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training in empty warehouses.
- Evaluation trap: Ignoring human workers in the environment.
- Wireless network drop: robots lose coordination.
- Blocked aisle from fallen items: a blocked aisle creates a deadlock risk as robots keep planning through it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
