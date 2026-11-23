# Field Crew Dispatch Optimisation: use-case brief

> Generated from the blueprint `energy/field-crew-dispatch-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Crew Dispatch Optimisation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient. The system has to run interactively, within a few seconds, inside these limits: Skills and safety certifications are hard constraints, Dispatcher can override and Re-plan within 60 s after a new emergency.

**Why it is hard.** The obvious approach is a preference, and it fails because a person without the certification cannot do the work. The second trap is in "Objective": the real signal is priority-weighted completion time and travel, while teams usually reach for distance.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $8.2K a month. A mistake is expensive in the way jobs per crew-day measures it.

**What success looks like.** Offline: Plan feasibility, Emergency response time and Travel time per job. Online: Response time, Jobs per crew-day and Overtime hours. The launch is judged on "Response time" while "Jobs per crew-day" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient.

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

- Skills and safety certifications are hard constraints
- Dispatcher can override
- Re-plan within 60 s after a new emergency
- Working-time rules respected
- 4K crews

## The approach in one paragraph

Start with dispatchers assign the nearest crew to the highest-priority job, because it is the current method. Then earn the move to a dynamic vehicle routing planner with skills and time rules, emergency insertion and a dispatcher view with explanations and overrides, and only if it beats the baseline on Plan feasibility and Emergency response time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Job priority and deadline | Emergency level and due time. Order. Guard against: from work management. |
| Add Crew skills and location | Certifications and position. Feasibility. Guard against: from the crew app. |
| Add Parts availability on truck | Stock held on the vehicle. Feasibility. Guard against: from inventory. |
| Run it as one pipeline | Job intake (work management), Constraint model (skills and rules), Route optimiser (vehicle routing solver), Emergency insertion (event trigger) and Crew notification (mobile app), with Dispatcher review and Performance review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large storm | Priority tiers and mutual aid planning. |

**Deliberately not doing**

- Crew name: irrelevant.
- Job number: an identifier.
- Vehicle colour: irrelevant.

**How the approach is proven**

Prove it offline on Plan feasibility, Emergency response time and Travel time per job using time-ordered splits, then online on "Response time" with "Jobs per crew-day" as the guardrail. Watch for: Nearest-crew assignment only, Ignoring certification and Full automation of crews.

## Baseline and production design

- **Baseline (build this first):** Dispatchers assign the nearest crew to the highest-priority job, because it is the current method.
- **Production design:** A dynamic vehicle routing planner with skills and time rules, emergency insertion and a dispatcher view with explanations and overrides.

## Why AI, and why this kind

**Why AI.** Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient. The evidence that separates good from bad outcomes (Job priority and deadline, Crew skills and location, Parts availability on truck) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A preference" are what teams reach for first, and they fail because A person without the certification cannot do the work. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A dynamic vehicle routing planner with skills and time rules, emergency insertion and a dispatcher view with explanations and overrides.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Job priority and deadline, Crew skills and location, Parts availability on truck and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dispatchers assign the nearest crew to the highest-priority job, because it is the current method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A dynamic vehicle routing planner with skills and time rules, emergency insertion and a dispatcher view with explanations and overrides | chosen | Meets the 2500 ms envelope at $0.0030 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Response time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Nearest-crew assignment only.
- Evaluation trap: Ignoring certification.
- Large storm: demand exceeds crews.
- Crew absence: a crew is unavailable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
