# Ambulance Posting Optimisation: use-case brief

> Generated from the blueprint `public-safety/ambulance-posting-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambulance Posting Optimisation · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. The system has to run interactively, within a few seconds, inside these limits: Coverage targets in every zone, Supervisor approves moves and Crew rest and shift rules respected.

**Why it is hard.** The obvious approach is average response time, and it fails because averages leave some areas poorly covered. The second trap is in "Constraint": the real signal is crew rules and legal coverage, while teams usually reach for pure optimisation.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $8.2K a month. A mistake is expensive in the way zones below target measures it.

**What success looks like.** Offline: Coverage in simulation, Response time at the 90th percentile and Suggestion acceptance. Online: Response time, Zones below target and Unit travel distance. The launch is judged on "Response time" while "Zones below target" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor.

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

- Coverage targets in every zone
- Supervisor approves moves
- Crew rest and shift rules respected
- Re-plan on every status change
- 400 vehicles

## The approach in one paragraph

Start with fixed post locations by time of day, because they are the standard deployment. Then earn the move to a dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage, and only if it beats the baseline on Coverage in simulation and Response time at the 90th percentile after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unit status and location | Available units and positions. State. Guard against: from AVL. |
| Add Demand forecast by zone | Expected calls. Need. Guard against: from forecast. |
| Add Travel time estimates | Road travel times. Cost. Guard against: from traffic data. |
| Run it as one pipeline | Unit and call data (CAD and AVL), Demand forecast (time-series model), Coverage model (travel time engine), Move optimiser (solver) and Crew message (mobile data terminal), with Supervisor review and Simulation review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle major incident | Surge mode and mutual aid view. |

**Deliberately not doing**

- Crew name: irrelevant.
- Vehicle number: an identifier.
- Station nickname: an artefact.

**How the approach is proven**

Prove it offline on Coverage in simulation, Response time at the 90th percentile and Suggestion acceptance using time-ordered splits, then online on "Response time" with "Zones below target" as the guardrail. Watch for: Average-time objectives, Ignoring crew rules and Raw before-and-after comparisons.

## Baseline and production design

- **Baseline (build this first):** Fixed post locations by time of day, because they are the standard deployment.
- **Production design:** A dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage.

## Why AI, and why this kind

**Why AI.** Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor. The evidence that separates good from bad outcomes (Unit status and location, Demand forecast by zone, Travel time estimates) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average response time" are what teams reach for first, and they fail because averages leave some areas poorly covered. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unit status and location, Demand forecast by zone, Travel time estimates and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed post locations by time of day, because they are the standard deployment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage | chosen | Meets the 2500 ms envelope at $0.0030 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Response time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average-time objectives.
- Evaluation trap: Ignoring crew rules.
- Major incident: many units are committed.
- Crew fatigue: crew shifts overrun the legal limit.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
