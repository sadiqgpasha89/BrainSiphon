# AGV Fleet Traffic Orchestration: use-case brief

> Generated from the blueprint `manufacturing/agv-fleet-traffic-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AGV Fleet Traffic Orchestration · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time. The system has to run interactively, within a few seconds, inside these limits: Collision avoidance remains with vehicle safety systems, Re-plan within 1 s after a blockage and Priority rules for urgent missions.

**Why it is hard.** The obvious approach is independent shortest paths, and it fails because independent paths collide at intersections. The second trap is in "Objective": the real signal is mission completion time and throughput, while teams usually reach for vehicle utilisation.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $5.1K a month. A mistake is expensive in the way mission wait time measures it.

**What success looks like.** Offline: Deadlock rate in simulation, Mission time against the baseline and Re-plan latency. Online: Throughput, Mission wait time and Interventions per shift. The launch is judged on "Throughput" while "Mission wait time" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Collision avoidance remains with vehicle safety systems
- Re-plan within 1 s after a blockage
- Priority rules for urgent missions
- 300 vehicles per site

## The approach in one paragraph

Start with a central dispatcher assigning the nearest free vehicle with shortest-path routes, because it is the vendor default. Then earn the move to a multi-agent path planner with time-window reservations and a learned blockage model, tested in a simulator before use and a stability filter against thrashing, and only if it beats the baseline on Deadlock rate in simulation and Mission time against the baseline after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Segment occupancy and reservation | Which segments are held and when. Conflict avoidance. Guard against: live map. |
| Add Mission urgency | Due time of the mission. Priority. Guard against: from MES. |
| Add Battery state and charging slots | Charge level and slot availability. Feasibility. Guard against: from the fleet system. |
| Run it as one pipeline | Mission intake (MES and WMS), Assignment (optimiser), Path planning with reservations (multi-agent planner), Blockage prediction (model), Command dispatch (fleet manager), Simulation tests (site simulator) and Performance monitor (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle blocked aisle | Detect blockage and reroute with an operator alert. |

**Deliberately not doing**

- Vehicle name: an identifier.
- Mission number: an identifier.
- Colour of the vehicle: irrelevant.

**How the approach is proven**

Prove it offline on Deadlock rate in simulation, Mission time against the baseline and Re-plan latency using time-ordered splits, then online on "Throughput" with "Mission wait time" as the guardrail. Watch for: Independent shortest paths, Making the planner the safety layer and No simulation.

## Baseline and production design

- **Baseline (build this first):** A central dispatcher assigning the nearest free vehicle with shortest-path routes, because it is the vendor default.
- **Production design:** A multi-agent path planner with time-window reservations and a learned blockage model, tested in a simulator before use and a stability filter against thrashing.

## Why AI, and why this kind

**Why AI.** Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time. The evidence that separates good from bad outcomes (Segment occupancy and reservation, Mission urgency, Battery state and charging slots) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent shortest paths" are what teams reach for first, and they fail because independent paths collide at intersections. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A multi-agent path planner with time-window reservations and a learned blockage model, tested in a simulator before use and a stability filter against thrashing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Segment occupancy and reservation, Mission urgency, Battery state and charging slots and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A central dispatcher assigning the nearest free vehicle with shortest-path routes, because it is the vendor default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-agent path planner with time-window reservations and a learned blockage model, tested in a simulator before use and a stability filter against thrashing | chosen | Meets the 2500 ms envelope at $0.0028 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Throughput) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Independent shortest paths.
- Evaluation trap: Making the planner the safety layer.
- Blocked aisle: a pallet is left in the lane.
- Network loss: vehicles lose the plan.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
