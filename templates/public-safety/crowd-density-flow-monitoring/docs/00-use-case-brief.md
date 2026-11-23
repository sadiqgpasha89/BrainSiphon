# Crowd Density and Flow Monitoring: use-case brief

> Generated from the blueprint `public-safety/crowd-density-flow-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crowd Density and Flow Monitoring · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous. The system has to run interactively, within a few seconds, inside these limits: Density estimates every 10 s, Thresholds set by safety planners and Counts only with no identity.

**Why it is hard.** The obvious approach is total attendance, and it fails because danger depends on local density. The second trap is in "Privacy": the real signal is counts and heat maps, while teams usually reach for face recognition.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $335.6K a month. A mistake is expensive in the way time to open exits measures it.

**What success looks like.** Offline: Count error by density band, Alert lead time and Zone coverage. Online: Crowd incidents, Time to open exits and Staff deployment accuracy. The launch is judged on "Crowd incidents" while "Time to open exits" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous.

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

- Density estimates every 10 s
- Thresholds set by safety planners
- Counts only with no identity
- Operators decide every intervention
- 200 zones

## The approach in one paragraph

Start with staff observation and ticket counts, because they are the current monitoring. Then earn the move to a density estimation model with exit capacity logic and early warning thresholds, shown to the operations room with recommended actions, and only if it beats the baseline on Count error by density band and Alert lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Density per zone | Estimated people per square metre. Core. Guard against: from vision. |
| Add Flow direction and speed | Movement patterns. Early warning. Guard against: from optical flow. |
| Add Capacity of exits and corridors | Exit width and capacity. Constraint. Guard against: from plans. |
| Run it as one pipeline | Camera capture (venue cameras), Density estimation (vision model), Flow analysis (optical flow), Threshold logic (safety rules), Operations room display (console) and Operator action log (event system), with After-event review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle occlusion | Multi-camera fusion. |

**Deliberately not doing**

- Event name: an identifier.
- Camera brand: an artefact.
- Clothing colour: irrelevant.

**How the approach is proven**

Prove it offline on Count error by density band, Alert lead time and Zone coverage using time-ordered splits, then online on "Crowd incidents" with "Time to open exits" as the guardrail. Watch for: Identification of people, Total attendance as the metric and Automatic gate closure.

## Baseline and production design

- **Baseline (build this first):** Staff observation and ticket counts, because they are the current monitoring.
- **Production design:** A density estimation model with exit capacity logic and early warning thresholds, shown to the operations room with recommended actions.

## Why AI, and why this kind

**Why AI.** Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous. The evidence that separates good from bad outcomes (Density per zone, Flow direction and speed, Capacity of exits and corridors) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total attendance" are what teams reach for first, and they fail because danger depends on local density. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A density estimation model with exit capacity logic and early warning thresholds, shown to the operations room with recommended actions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Density per zone, Flow direction and speed, Capacity of exits and corridors and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff observation and ticket counts, because they are the current monitoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A density estimation model with exit capacity logic and early warning thresholds, shown to the operations room with recommended actions | chosen | Meets the 2500 ms envelope at $0.124 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Crowd incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Identification of people.
- Evaluation trap: Total attendance as the metric.
- Occlusion: people hide each other.
- Night events: low light affects counts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
