# Waste Collection Route Optimisation: use-case brief

> Generated from the blueprint `public-sector/waste-collection-route-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Waste Collection Route Optimisation · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall. The system has to run as a scheduled batch job, inside these limits: Collection frequency rules and service promises respected, Driver hours and vehicle capacity as hard limits and Supervisors approve routes.

**Why it is hard.** The obvious approach is fill level alone, and it fails because residents are promised pickups. The second trap is in "Objective": the real signal is distance and time with equal service, while teams usually reach for distance only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way missed collection complaints measures it.

**What success looks like.** Offline: Missed collections, Distance saved and Service parity across areas. Online: Kilometres driven, Missed collection complaints and Overtime hours. The launch is judged on "Kilometres driven" while "Missed collection complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall.

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

- Collection frequency rules and service promises respected
- Driver hours and vehicle capacity as hard limits
- Supervisors approve routes
- Daily plans for 300 trucks

## The approach in one paragraph

Start with fixed weekly routes by zone, because they are the standard service pattern. Then earn the move to a fill-level forecast with a vehicle routing optimiser that keeps service promises, a supervisor review and a service equity check, and only if it beats the baseline on Missed collections and Distance saved after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Bin fill estimate | Estimated fill by bin. Need. Guard against: from sensors and models. |
| Add Service rules | Scheduled days and statutory limits. Constraint. Guard against: from policy. |
| Add Vehicle capacity and shift limits | Load, volume and hours. Constraint. Guard against: from fleet data. |
| Run it as one pipeline | Fill and fleet data (sensors and telematics), Fill forecast (time-series model), Route optimiser (vehicle routing solver), Service rule filter (rules), Supervisor approval (routing tool) and Driver task list (mobile app), with Equity review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor failure | Historic fill profiles and flags. |

**Deliberately not doing**

- Driver name: irrelevant.
- Bin colour: irrelevant.
- Route id: an identifier.

**How the approach is proven**

Prove it offline on Missed collections, Distance saved and Service parity across areas using time-ordered splits, then online on "Kilometres driven" with "Missed collection complaints" as the guardrail. Watch for: Distance-only objectives, Ignoring service promises and Sensors-only data.

## Baseline and production design

- **Baseline (build this first):** Fixed weekly routes by zone, because they are the standard service pattern.
- **Production design:** A fill-level forecast with a vehicle routing optimiser that keeps service promises, a supervisor review and a service equity check.

## Why AI, and why this kind

**Why AI.** Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall. The evidence that separates good from bad outcomes (Bin fill estimate, Service rules, Vehicle capacity and shift limits) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fill level alone" are what teams reach for first, and they fail because residents are promised pickups. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A fill-level forecast with a vehicle routing optimiser that keeps service promises, a supervisor review and a service equity check.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Bin fill estimate, Service rules, Vehicle capacity and shift limits and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed weekly routes by zone, because they are the standard service pattern | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A fill-level forecast with a vehicle routing optimiser that keeps service promises, a supervisor review and a service equity check | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Kilometres driven) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Distance-only objectives.
- Evaluation trap: Ignoring service promises.
- Sensor failure: fill data is missing.
- Holiday peak: volumes rise sharply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
