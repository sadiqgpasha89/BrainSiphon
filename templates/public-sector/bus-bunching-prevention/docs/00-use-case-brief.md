# Bus Bunching Prevention: use-case brief

> Generated from the blueprint `public-sector/bus-bunching-prevention` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bus Bunching Prevention · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules. The system has to run interactively, within a few seconds, inside these limits: Recommendations respect driver hours and safety rules, Controllers approve any intervention and Messages within 10 s.

**Why it is hard.** The obvious approach is on-time at timepoints only, and it fails because frequent routes depend on spacing. The second trap is in "Safety": the real signal is rules enforced in code, while teams usually reach for learned preferences.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $6.7K a month. A mistake is expensive in the way bunching events measures it.

**What success looks like.** Offline: Headway variation in simulation, Rule violation rate and Passenger wait time. Online: Excess wait time, Bunching events and Controller acceptance rate. The launch is judged on "Excess wait time" while "Bunching events" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules.

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

- Recommendations respect driver hours and safety rules
- Controllers approve any intervention
- Messages within 10 s
- Simulation test before live use
- 300 vehicles

## The approach in one paragraph

Start with timetable adherence rules and manual holding at timepoints, because they are the standard controls. Then earn the move to a control policy trained in simulation with a rules-based clip that proposes holds and skips to controllers, evaluated on matched days, and only if it beats the baseline on Headway variation in simulation and Rule violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Headway gap to the vehicle ahead | Time gap to the leader. Bunching risk. Guard against: from AVL. |
| Add Passenger load | Onboard count. Dwell. Guard against: from counters. |
| Add Traffic delay forecast | Delay on the next segment. Arrival. Guard against: from traffic data. |
| Run it as one pipeline | Vehicle location feed (AVL), Headway estimate (stream processing), Control policy (reinforcement learning), Rules clip (constraints), Controller advice (control centre), Driver message (onboard unit) and Evaluation (matched days). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle traffic incident | Corridor-wide advice. |

**Deliberately not doing**

- Driver name: irrelevant.
- Vehicle number: an identifier.
- Shift label: weak link.

**How the approach is proven**

Prove it offline on Headway variation in simulation, Rule violation rate and Passenger wait time using time-ordered splits, then online on "Excess wait time" with "Bunching events" as the guardrail. Watch for: On-time at timepoints only, Learned labour rules and Raw before-and-after comparison.

## Baseline and production design

- **Baseline (build this first):** Timetable adherence rules and manual holding at timepoints, because they are the standard controls.
- **Production design:** A control policy trained in simulation with a rules-based clip that proposes holds and skips to controllers, evaluated on matched days.

## Why AI, and why this kind

**Why AI.** Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules. The evidence that separates good from bad outcomes (Headway gap to the vehicle ahead, Passenger load, Traffic delay forecast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "on-time at timepoints only" are what teams reach for first, and they fail because frequent routes depend on spacing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A control policy trained in simulation with a rules-based clip that proposes holds and skips to controllers, evaluated on matched days.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Headway gap to the vehicle ahead, Passenger load, Traffic delay forecast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Timetable adherence rules and manual holding at timepoints, because they are the standard controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A control policy trained in simulation with a rules-based clip that proposes holds and skips to controllers, evaluated on matched days | chosen | Meets the 2500 ms envelope at $0.0037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Excess wait time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: On-time at timepoints only.
- Evaluation trap: Learned labour rules.
- Traffic incident: delays occur across a corridor.
- Vehicle breakdown: a large gap appears between buses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
