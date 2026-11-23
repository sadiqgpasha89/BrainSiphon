# Crew and Equipment Scheduling: use-case brief

> Generated from the blueprint `engineering/crew-equipment-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crew and Equipment Scheduling · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve. The system has to run as a scheduled batch job, inside these limits: Labour rules and rest periods respected, Safety limits on lifts and zones enforced and Planners approve the plan.

**Why it is hard.** The obvious approach is utilisation alone, and it fails because high utilisation delays critical work. The second trap is in "Constraint": the real signal is safety, labour and access rules, while teams usually reach for soft preferences.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way schedule conflicts measures it.

**What success looks like.** Offline: Plan feasibility, Utilisation and delay in simulation and Planner acceptance. Online: Idle equipment time, Schedule conflicts and Overtime hours. The launch is judged on "Idle equipment time" while "Schedule conflicts" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve.

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

- Labour rules and rest periods respected
- Safety limits on lifts and zones enforced
- Planners approve the plan
- Replan within 10 minutes
- 200 sites

## The approach in one paragraph

Start with weekly planning meetings with spreadsheets, because it is the usual practice. Then earn the move to an optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change, and only if it beats the baseline on Plan feasibility and Utilisation and delay in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Activity demand | Work and crew type needed. Core. Guard against: from the schedule. |
| Add Resource availability | Crews and equipment by day. Core. Guard against: from the resource plan. |
| Add Site constraints | Lift zones and access. Constraint. Guard against: from the site plan. |
| Run it as one pipeline | Demand and availability (schedule and resource data), Constraint model (rules), Plan optimisation (solver), Planner approval (weekly meeting), Publication (site app) and Replan on change (trigger), with Conflict report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle equipment failure | Alternative plans. |

**Deliberately not doing**

- Worker name: personal data.
- Equipment brand: weak link.
- Crew nickname: irrelevant.

**How the approach is proven**

Prove it offline on Plan feasibility, Utilisation and delay in simulation and Planner acceptance using time-ordered splits, then online on "Idle equipment time" with "Schedule conflicts" as the guardrail. Watch for: Utilisation alone, Soft safety limits and Individual tracking.

## Baseline and production design

- **Baseline (build this first):** Weekly planning meetings with spreadsheets, because it is the usual practice.
- **Production design:** An optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change.

## Why AI, and why this kind

**Why AI.** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve. The evidence that separates good from bad outcomes (Activity demand, Resource availability, Site constraints) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "utilisation alone" are what teams reach for first, and they fail because high utilisation delays critical work. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: An optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Activity demand, Resource availability, Site constraints and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Weekly planning meetings with spreadsheets, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Idle equipment time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Utilisation alone.
- Evaluation trap: Soft safety limits.
- Equipment failure: a crane is out of service.
- Weather loss: work stops for a day.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
