# Field Technician Dispatch Optimisation: use-case brief

> Generated from the blueprint `telecom/field-technician-dispatch-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Technician Dispatch Optimisation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel. The system has to run interactively, within a few seconds, inside these limits: Skills, parts and working-time rules as hard constraints, Re-optimisation within 60 s after a change and Dispatcher can override.

**Why it is hard.** The obvious approach is utilisation alone, and it fails because high utilisation produces late jobs. The second trap is in "Estimate": the real signal is job duration predicted from job type and history, while teams usually reach for fixed standard times.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $4.0K a month. A mistake is expensive in the way kilometres per job measures it.

**What success looks like.** Offline: Duration prediction error, Plan feasibility and On-time rate in simulation. Online: On-time completion, Kilometres per job and Repeat visits. The launch is judged on "On-time completion" while "Kilometres per job" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel.

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

- Skills, parts and working-time rules as hard constraints
- Re-optimisation within 60 s after a change
- Dispatcher can override
- Fair workload spread
- 20K jobs per day

## The approach in one paragraph

Start with a greedy dispatcher assigning the nearest qualified technician, because it is the common approach and the benchmark. Then earn the move to a vehicle routing optimiser with learned durations and a rolling horizon re-plan, with a simulator for policy testing and dispatcher override logging, and only if it beats the baseline on Duration prediction error and Plan feasibility after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted job duration | Model of duration by job type, site and technician skill. Plan accuracy. Guard against: use confirmed durations. |
| Add Travel time matrix | Road travel time by period. Route cost. Guard against: traffic aware. |
| Add Parts availability | Parts in the vehicle or depot. Avoids repeat visits. Guard against: live stock. |
| Run it as one pipeline | Job and schedule intake (field service system), Duration model (gradient boosting), Travel matrix (routing service), Optimiser (vehicle routing solver), Re-plan on events (streaming triggers), Dispatcher console (field service tool) and Outcome capture (lakehouse). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle emergency job | Priority insertion and re-optimisation with minimal change. |

**Deliberately not doing**

- Technician name: irrelevant.
- Vehicle colour: irrelevant.
- Ticket text length: weak link.

**How the approach is proven**

Prove it offline on Duration prediction error, Plan feasibility and On-time rate in simulation using time-ordered splits, then online on "On-time completion" with "Kilometres per job" as the guardrail. Watch for: Fixed standard times, Planning once a day and Ignoring parts.

## Baseline and production design

- **Baseline (build this first):** A greedy dispatcher assigning the nearest qualified technician, because it is the common approach and the benchmark.
- **Production design:** A vehicle routing optimiser with learned durations and a rolling horizon re-plan, with a simulator for policy testing and dispatcher override logging.

## Why AI, and why this kind

**Why AI.** Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel. The evidence that separates good from bad outcomes (Predicted job duration, Travel time matrix, Parts availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "utilisation alone" are what teams reach for first, and they fail because high utilisation produces late jobs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A vehicle routing optimiser with learned durations and a rolling horizon re-plan, with a simulator for policy testing and dispatcher override logging.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted job duration, Travel time matrix, Parts availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A greedy dispatcher assigning the nearest qualified technician, because it is the common approach and the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A vehicle routing optimiser with learned durations and a rolling horizon re-plan, with a simulator for policy testing and dispatcher override logging | chosen | Meets the 2500 ms envelope at $0.088 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-time completion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed standard times.
- Evaluation trap: Planning once a day.
- Emergency job: the day plan is disrupted.
- Technician absent: daily capacity drops suddenly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
