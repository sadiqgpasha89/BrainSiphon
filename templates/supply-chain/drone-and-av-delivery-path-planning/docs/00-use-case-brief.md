# Drone & Autonomous Vehicle Delivery Planning: use-case brief

> Generated from the blueprint `supply-chain/drone-and-av-delivery-path-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drone & Autonomous Vehicle Delivery Planning · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints. The system has to run in under 100 milliseconds, inside these limits: Airspace and no-fly rules, Battery limits and Real-time perception.

**Why it is hard.** The obvious approach is pure learned navigation, and it fails because learned planners lack guarantees. The second trap is in "Energy": the real signal is wind-aware energy model, while teams usually reach for distance-based range.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.3K a month. A mistake is expensive in the way incidents per 10k flights measures it.

**What success looks like.** Offline: Collision and violation counts in simulation and Energy prediction error. Online: Mission success rate and Incidents per 10k flights. The launch is judged on "Mission success rate" while "Incidents per 10k flights" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints.

**Training objective.** `\min_\pi\;\mathbb{E}\!\left[\sum_t c_{\text{energy}}+\lambda_1 c_{\text{risk}}+\lambda_2 c_{\text{time}}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\pi | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_{\text{energy}} | Cost per step: c_energy for energy used, c_risk for risk and c_time for delay. |
| \lambda_1 | Weights lambda_1 on risk and lambda_2 on time. |

**Hard constraints**

- Airspace and no-fly rules
- Battery limits
- Real-time perception
- Safety certification

## The approach in one paragraph

Start with a* planning on static map with fixed reserves. Then earn the move to sampling-based planner with learned cost maps, energy model, and runtime assurance monitor that enforces safe fallback behaviours, and only if it beats the baseline on Collision and violation counts in simulation and Energy prediction error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Wind and weather forecast | Forecast along path. Energy and safety. Guard against: forecast. |
| Add Obstacle map confidence | Perception uncertainty. Collision risk. Guard against: calibration. |
| Add Battery state and reserve | Remaining energy vs plan. Feasibility. Guard against: battery model. |
| Run it as one pipeline | Mission request (dispatch), Airspace and weather check (services), Path planner (MPC with learned costs), Runtime assurance (safety monitor), Vehicle autopilot (edge), Remote operator (human oversight) and Flight logs (analytics). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle gPS loss | Visual-inertial fallback and return-to-home. |

**Deliberately not doing**

- Package colour: none.
- Customer ID: none.

**How the approach is proven**

Prove it offline on Collision and violation counts in simulation and Energy prediction error using time-ordered splits, then online on "Mission success rate" with "Incidents per 10k flights" as the guardrail. Watch for: Simulation without realistic wind and Training in static environments.

## Baseline and production design

- **Baseline (build this first):** A* planning on static map with fixed reserves.
- **Production design:** Sampling-based planner with learned cost maps, energy model, and runtime assurance monitor that enforces safe fallback behaviours.

## Why AI, and why this kind

**Why AI.** Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints. The evidence that separates good from bad outcomes (Wind and weather forecast, Obstacle map confidence, Battery state and reserve) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pure learned navigation" are what teams reach for first, and they fail because learned planners lack guarantees. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Sampling-based planner with learned cost maps, energy model, and runtime assurance monitor that enforces safe fallback behaviours.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Wind and weather forecast, Obstacle map confidence, Battery state and reserve and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A* planning on static map with fixed reserves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sampling-based planner with learned cost maps, energy model, and runtime assurance monitor that enforces safe fallback behaviours | chosen | Meets the 80 ms envelope at $6.82 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mission success rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulation without realistic wind.
- Evaluation trap: Training in static environments.
- GPS loss: drift and unsafe position.
- Sudden gusts: energy shortfall.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
