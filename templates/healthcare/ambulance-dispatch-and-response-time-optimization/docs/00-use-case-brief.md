# Ambulance Dispatch & Positioning: use-case brief

> Generated from the blueprint `healthcare/ambulance-dispatch-and-response-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Dispatch & Positioning · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. The system has to run in under 100 milliseconds, inside these limits: Decision under 100 ms, Priority-based response targets and Crew shift limits.

**Why it is hard.** The obvious approach is average response time, and it fails because averages hide failures for high-priority calls. The second trap is in "Demand": the real signal is spatiotemporal demand forecasts for repositioning, while teams usually reach for static base stations.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $3.6K a month. A mistake is expensive in the way cardiac arrest survival measures it.

**What success looks like.** Offline: Simulated response-time percentiles by priority and Coverage metrics. Online: 90th percentile response time and Cardiac arrest survival. The launch is judged on "90th percentile response time" while "Cardiac arrest survival" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage.

**Training objective.** `\min_\pi\;\mathbb{E}\!\left[\sum_t w(\text{priority}_t)\cdot \text{response}_t\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\pi | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w | A weight that increases with call priority, so urgent calls matter most. |
| \text{priority}_t | The urgency priority of call t. |
| \text{response}_t | The response time to call t. |

**Hard constraints**

- Decision under 100 ms
- Priority-based response targets
- Crew shift limits
- Geographic equity

## The approach in one paragraph

Start with closest-available-unit dispatch. Then earn the move to demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override, and only if it beats the baseline on Simulated response-time percentiles by priority and Coverage metrics after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spatiotemporal demand intensity | Forecast calls per grid cell-hour. Positioning. Guard against: forecast not actual. |
| Add Travel-time estimate | Live-traffic ETA. Dispatch. Guard against: live feed. |
| Add Unit availability state | Crew and vehicle status. Feasibility. Guard against: real-time. |
| Run it as one pipeline | Emergency call intake (CAD), Priority classifier (NLP on call notes), Demand forecaster (spatiotemporal model), Dispatch optimiser (assignment solver), Repositioning policy (ADP), Dispatcher decision (human) and Response time logs (analytics). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle mass-casualty incident | Incident mode with manual command and fallback rules. |

**Deliberately not doing**

- Dispatcher ID: personal.
- Call centre queue length: operational.

**How the approach is proven**

Prove it offline on Simulated response-time percentiles by priority and Coverage metrics using time-ordered splits, then online on "90th percentile response time" with "Cardiac arrest survival" as the guardrail. Watch for: Simulation uses historical calls ignoring policy effects and Optimising mean rather than tail.

## Baseline and production design

- **Baseline (build this first):** Closest-available-unit dispatch.
- **Production design:** Demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override.

## Why AI, and why this kind

**Why AI.** Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage. The evidence that separates good from bad outcomes (Spatiotemporal demand intensity, Travel-time estimate, Unit availability state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average response time" are what teams reach for first, and they fail because averages hide failures for high-priority calls. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spatiotemporal demand intensity, Travel-time estimate, Unit availability state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Closest-available-unit dispatch | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override | chosen | Meets the 80 ms envelope at $3.97 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (90th percentile response time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulation uses historical calls ignoring policy effects.
- Evaluation trap: Optimising mean rather than tail.
- Mass-casualty incident: all assumptions break.
- GPS outage: vehicle positions go stale so dispatch decisions rely on wrong locations and ETAs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
